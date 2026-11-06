import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { byCodeUnit } from '../shared/order'

import { defineExec, type ExecApi, type ExecResult } from './exec'

const { andThen, err, ok } = rust

// 仓库级 Go 静态检查：格式与 vet。工具失败必须非零退出——gofmt 在解析错误时
// 可能 stdout 为空，不能只用 `gofmt -l | grep` 判断。

export interface GoCheckOptions {
  /** 全仓修复入口；格式化失败时提示 「or <fixCommand>」 */
  readonly fixCommand: string
}

function argvFromEnv(
  value: string | undefined,
  fallback: readonly string[],
  name: string
): rust.Result<readonly string[], string> {
  if (value === undefined) return ok(fallback)
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return err(`${name} must be a JSON array of non-empty strings`)
  }
  if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some(item => typeof item !== 'string' || item === '')) {
    return err(`${name} must be a JSON array of non-empty strings`)
  }
  return ok(parsed as readonly string[])
}

function collectGoSources(root: string): { goFiles: string[]; moduleDirs: string[] } {
  const goFiles: string[] = []
  const moduleDirs: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      const absolute = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(absolute)
      else if (entry.name === 'go.mod') moduleDirs.push(directory)
      else if (entry.name.endsWith('.go')) goFiles.push(path.relative(root, absolute).split(path.sep).join('/'))
    }
  }
  visit(root)
  return { goFiles: goFiles.sort(byCodeUnit), moduleDirs: moduleDirs.sort(byCodeUnit) }
}

/**
 * Go 格式与 vet 判定，链上以 `go: ` 起头归因。
 *
 * 自带 `defineExec()`：产 `run` 的插件自己接齐所需能力，触发层只决定它在链里的位置。
 */
export const defineGoCheck = (options: GoCheckOptions): Chain =>
  defineRunner()
    .use(defineExec())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & ExecApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const gofmtArgv = argvFromEnv(ctx.env.AGENT_GOFMT_ARGV, ['gofmt'], 'AGENT_GOFMT_ARGV')
            if (!gofmtArgv.ok) return err(`go: ${gofmtArgv.error}`)
            const goArgv = argvFromEnv(ctx.env.AGENT_GO_VET_ARGV, ['go'], 'AGENT_GO_VET_ARGV')
            if (!goArgv.ok) return err(`go: ${goArgv.error}`)

            const failureDetail = (result: ExecResult): string => `:\n${ctx.failureEvidence(result)}`
            const { goFiles, moduleDirs } = collectGoSources(ctx.root)

            if (goFiles.length > 0) {
              const result = ctx.exec(gofmtArgv.value[0], [...gofmtArgv.value.slice(1), '-l', ...goFiles], {
                stdio: 'pipe'
              })
              if (!result.ok) return err(`go: gofmt failed${failureDetail(result)}`)
              const dirty = result.stdout.trim()
              if (dirty)
                return err(
                  `go: Go files are not formatted:\n${dirty}\nrun: gofmt -w <files> (or ${options.fixCommand})`
                )
            }

            for (const moduleDir of moduleDirs) {
              const relative = path.relative(ctx.root, moduleDir) || '.'
              const result = ctx.exec(goArgv.value[0], [...goArgv.value.slice(1), 'vet', './...'], {
                cwd: moduleDir,
                stdio: 'pipe'
              })
              if (!result.ok) return err(`go: go vet failed in ${relative}${failureDetail(result)}`)
            }

            return ok(undefined)
          })
      }))
    )
