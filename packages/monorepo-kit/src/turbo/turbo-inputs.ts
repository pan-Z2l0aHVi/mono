import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { defineExec, type ExecApi } from '../exec/exec'
import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'

import { defineTurbo, type TurboApi } from './turbo'

const { andThen, err, ok } = rust

// 包构建会读包目录之外的输入（工具链生成物、共享配置），它们的缓存键必须同时覆盖这些输入，
// 又不能被文档与测试文件污染。本检查在隔离的 workspace 副本里跑 Turbo 的 `--dry=json`，
// 既不读也不写真实应用的缓存，只看任务哈希。包名、包目录与输入清单都是消费仓库的事实，
// 经 options 传入。

const TASKS: readonly string[] = ['build', 'test']

export interface TurboInput {
  /** 仓库相对路径 */
  readonly path: string
  /** fixture 里的初始内容 */
  readonly contents: string
  /** 失败信息里用来指认这条输入的名字 */
  readonly label: string
  /** 改动后的内容，必须与初始内容不同 */
  readonly change: string
}

export interface TurboInputsOptions {
  /** fixture 临时目录前缀，也是这条输入清单的名字 */
  readonly name: string
  /** `--filter` 使用的包名 */
  readonly packageName: string
  /** 包目录，仓库相对 */
  readonly packageDir: string
  /** 从真实仓库原样复制进 fixture 的文件（Turbo 配置、模块清单等） */
  readonly copiedFiles: readonly string[]
  /** 改动后必须让每个任务失效的文件 */
  readonly requiredInputs: readonly TurboInput[]
  /** 改动后不得让任何任务失效的文件 */
  readonly ignoredInputs: readonly TurboInput[]
}

function writeFixture(root: string, relativePath: string, contents: string): void {
  const absolutePath = path.join(root, relativePath)
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true })
  fs.writeFileSync(absolutePath, contents)
}

/**
 * Turbo 输入覆盖面判定，链上以 `turbo: ` 起头归因。dry-run 的退出码、输出形状与任务缺席
 * 都是判定失败而不是崩检，所以逐条转成 `Err` 返回。
 */
export const defineTurboInputs = (options: TurboInputsOptions): Chain => {
  const { name, packageName, packageDir, copiedFiles, requiredInputs, ignoredInputs } = options

  return defineRunner()
    .use(defineExec())
    .use(defineTurbo())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & ExecApi & TurboApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const turboCli = ctx.cli()
            if (!fs.existsSync(turboCli))
              return err(`turbo: Turbo executable not found at ${turboCli}; install workspace dependencies first`)

            const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))

            try {
              writeFixture(
                fixtureRoot,
                'package.json',
                JSON.stringify({ name: 'turbo-fixture', private: true, packageManager: 'pnpm@12.4.0' })
              )
              writeFixture(fixtureRoot, 'pnpm-workspace.yaml', `packages:\n  - ${packageDir}\n`)
              writeFixture(
                fixtureRoot,
                'pnpm-lock.yaml',
                `lockfileVersion: '9.0'\nsettings:\n  autoInstallPeers: true\n  excludeLinksFromLockfile: false\nimporters:\n  .: {}\n  ${packageDir}: {}\n`
              )
              for (const file of copiedFiles) {
                const destination = path.join(fixtureRoot, file)
                fs.mkdirSync(path.dirname(destination), { recursive: true })
                fs.copyFileSync(path.join(ctx.root, file), destination)
              }
              writeFixture(
                fixtureRoot,
                `${packageDir}/package.json`,
                JSON.stringify({
                  name: packageName,
                  private: true,
                  scripts: { build: 'echo build', test: 'echo test' }
                })
              )
              for (const input of [...requiredInputs, ...ignoredInputs]) {
                writeFixture(fixtureRoot, input.path, input.contents)
              }

              const fixtureEnv = {
                ...ctx.env,
                TURBO_CACHE_DIR: path.join(fixtureRoot, '.turbo'),
                TURBO_TELEMETRY_DISABLED: '1'
              }

              function taskHash(task: string): rust.Result<string, string> {
                const result = ctx.exec(
                  process.execPath,
                  [turboCli, 'run', task, `--filter=${packageName}`, '--dry=json'],
                  { cwd: fixtureRoot, env: fixtureEnv }
                )
                if (!result.ok) return err(`turbo: turbo ${task} dry-run failed: ${ctx.failureEvidence(result)}`)
                let output: { tasks?: Array<{ taskId: string; hash: string }> }
                try {
                  output = JSON.parse(result.stdout) as { tasks?: Array<{ taskId: string; hash: string }> }
                } catch {
                  return err(`turbo: turbo ${task} dry-run printed no JSON`)
                }
                const target = (output.tasks ?? []).find(item => item.taskId === `${packageName}#${task}`)
                return target ? ok(target.hash) : err(`turbo: turbo dry-run must contain ${packageName}#${task}`)
              }

              function hashes(): rust.Result<string[], string> {
                const values: string[] = []
                for (const task of TASKS) {
                  const hash = taskHash(task)
                  if (!hash.ok) return err(hash.error)
                  values.push(hash.value)
                }
                return ok(values)
              }

              for (const input of requiredInputs) {
                const before = hashes()
                if (!before.ok) return err(before.error)
                writeFixture(fixtureRoot, input.path, input.change)
                for (const [index, task] of TASKS.entries()) {
                  const after = taskHash(task)
                  if (!after.ok) return err(after.error)
                  if (after.value === before.value[index]) return err(`turbo: ${input.label} must invalidate ${task}`)
                }
                writeFixture(fixtureRoot, input.path, input.contents)
              }

              for (const input of ignoredInputs) {
                const before = hashes()
                if (!before.ok) return err(before.error)
                writeFixture(fixtureRoot, input.path, input.change)
                for (const [index, task] of TASKS.entries()) {
                  const after = taskHash(task)
                  if (!after.ok) return err(after.error)
                  if (after.value !== before.value[index])
                    return err(`turbo: ${input.label} must not invalidate ${task}`)
                }
              }

              return ok(undefined)
            } finally {
              fs.rmSync(fixtureRoot, { recursive: true, force: true })
            }
          })
      }))
    )
}
