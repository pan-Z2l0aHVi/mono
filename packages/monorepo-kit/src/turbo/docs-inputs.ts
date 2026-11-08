import fs from 'node:fs'
import path from 'node:path'

import { definePlugin, rust } from '@greypan/js-kit'

import { type Chain, type KitCtx, type Run, defineRunner } from '../runner/runner'
import { byCodeUnit } from '../shared/order'

import { defineTurbo, type TurboApi } from './turbo'

const { andThen, err, ok } = rust

// 文档语料住在被发布包里的仓库：那批示例 md 是 build 与 test 的真输入。根 turbo.json 的
// `!**/*.md` 把这批 md 排掉，包级 turbo.json 必须重新纳入，并按名字排掉散文 md。本检查守两个
// 方向：包里每篇 md 都在名单里；覆写后的排除项不会盖回语料目录。包目录、语料目录与散文名单
// 都是消费仓库的事实，经 options 传入。

export interface DocsInputsOptions {
  /** 带独立 `turbo.json` 的包目录，仓库相对 */
  readonly packageDir: string
  /** 包内语料目录名 */
  readonly corpusDir: string
  /** 包根按文件名排除的散文 md */
  readonly proseNames: readonly string[]
}

function collectMarkdown(directory: string, base: string, files: string[]): void {
  if (!fs.existsSync(directory)) return
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue
      collectMarkdown(absolute, base, files)
    } else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.endsWith('.md')) {
      files.push(path.relative(base, absolute).split(path.sep).join('/'))
    }
  }
}

function globToRegExp(glob: string): RegExp {
  let source = '^'
  for (const char of glob) {
    if (char === '*') source += '.*'
    else if (char === '?') source += '.'
    else source += /[\\^$.*+?()[\]{}|]/.test(char) ? `\\${char}` : char
  }
  return new RegExp(`${source}$`)
}

// gitignore 口径：前导 `/` 锚定包根；无 `/` 的规则按任意深度同名；`**/` 可匹配零段。
// 含 glob 词表外字符的规则一律按「盖住语料」处理——守卫宁可假红。
function coversCorpus(pattern: string, probes: readonly string[]): boolean {
  const normalized = pattern.replace(/^\/+/, '')
  if (!/^[\]a-zA-Z0-9_./?*-]+$/.test(normalized)) return true
  const primary = normalized.includes('/') ? normalized : `**/${normalized}`
  const globs = new Set([primary, primary.replaceAll('/**/', '/')])
  let stripped = primary
  while (stripped.startsWith('**/')) {
    stripped = stripped.slice(3)
    globs.add(stripped)
  }
  for (const glob of globs) {
    const expression = globToRegExp(glob)
    if (probes.some(probe => expression.test(probe))) return true
  }
  return false
}

// 失败文案一律带上包目录：同一条判定会在一条链里为多个包各跑一次，只有包名能归因。
function requireInputs(configPath: string, task: unknown, taskName: string): rust.Result<string[], string> {
  if (!task || typeof task !== 'object') return err(`turbo: ${configPath} is missing tasks.${taskName}`)
  const inputs = (task as { inputs?: unknown }).inputs
  if (!Array.isArray(inputs))
    return err(
      `turbo: ${configPath} tasks.${taskName}.inputs is missing or not an array: the package-level override replaces the root definition`
    )
  if (inputs.length === 0)
    return err(`turbo: ${configPath} tasks.${taskName}.inputs is empty: the docs corpus leaves the hash`)
  for (const item of inputs) {
    if (typeof item !== 'string') return err(`turbo: ${configPath} tasks.${taskName}.inputs must contain only strings`)
  }
  return ok(inputs)
}

/**
 * 包级文档语料输入面的判定，链上以 `turbo: ` 起头归因，文案带上包目录。
 */
export const defineDocsInputs = ({ packageDir, corpusDir, proseNames }: DocsInputsOptions): Chain =>
  defineRunner()
    .use(defineTurbo())
    .use(
      definePlugin<{ run: Run }, KitCtx & { run: Run } & TurboApi>(ctx => ({
        run: () =>
          andThen(ctx.run(), async () => {
            const fail = (message: string): rust.Result<void, string> => err(`turbo: ${packageDir}: ${message}`)
            const packageRoot = path.join(ctx.root, packageDir)
            if (!fs.existsSync(packageRoot)) return fail('does not exist (run from the repository root)')
            const corpusRoot = path.join(packageRoot, corpusDir)
            if (!fs.existsSync(corpusRoot)) return fail(`${corpusDir}/ does not exist: this check would idle`)

            const allMarkdown: string[] = []
            collectMarkdown(packageRoot, packageRoot, allMarkdown)
            allMarkdown.sort(byCodeUnit)
            if (allMarkdown.length === 0) return fail('contains no Markdown: this check would idle')

            const corpusMarkdown = allMarkdown.filter(file => file.startsWith(`${corpusDir}/`))
            if (corpusMarkdown.length === 0) return fail(`${corpusDir}/ contains no Markdown: this check would idle`)

            const strays = allMarkdown.filter(file => {
              if (file.startsWith(`${corpusDir}/`)) return false
              if (proseNames.includes(file)) return false
              return !`/${file}/`.includes('/__tests__/')
            })
            if (strays.length > 0)
              return fail(
                `these Markdown files are not in the allowlist and would silently become build inputs:\n` +
                  `${strays.map(file => `  ${file}`).join('\n')}\n` +
                  `put prose Markdown in the excluded names (and update the policy's proseNames), or move it under ${packageDir}/${corpusDir}/`
              )

            const missingProse = proseNames.filter(file => !fs.existsSync(path.join(packageRoot, file)))
            if (missingProse.length > 0)
              return fail(`these allowlisted Markdown files are missing from the package: ${missingProse.join(', ')}`)

            const turboFile = `${packageDir}/turbo.json`
            if (!fs.existsSync(path.join(packageRoot, 'turbo.json')))
              return fail('has no turbo.json: without it the corpus is not an input to build or test')
            const config = ctx.config<{ extends?: unknown; tasks?: Record<string, unknown> }>(turboFile)
            if (JSON.stringify(config.extends) !== '["//"]')
              return fail('turbo.json extends must be ["//"], otherwise the override drops task definitions')

            const probes = [...corpusMarkdown, corpusDir, `${corpusDir}/`]
            for (const taskName of ['build', 'test']) {
              const inputs = requireInputs(turboFile, config.tasks?.[taskName], taskName)
              if (!inputs.ok) return err(inputs.error)
              if (!inputs.value.includes('$TURBO_DEFAULT$'))
                return fail(
                  `tasks.${taskName}.inputs is missing $TURBO_DEFAULT$: package files outside the list would leave the hash`
                )
              for (const rule of inputs.value) {
                if (rule.startsWith('!') && coversCorpus(rule.slice(1), probes))
                  return fail(
                    `tasks.${taskName}.inputs exclude rule !${rule.slice(1)} covers the ${corpusDir}/ corpus; excluded Markdown no longer affects the cache`
                  )
              }
              for (const proseName of proseNames) {
                if (!inputs.value.includes(`!${proseName}`))
                  return fail(
                    `tasks.${taskName}.inputs is missing !${proseName}: prose Markdown would become an input of this task again`
                  )
              }
            }

            for (const pattern of [
              `/${corpusDir}/**`,
              '/**/*.md',
              '*.md',
              `**/${corpusDir}/**`,
              `**/${corpusDir}`,
              `**/**/${corpusDir}/**`
            ]) {
              if (!coversCorpus(pattern, probes))
                return fail(
                  `coversCorpus missed ${pattern}: normalization was removed and this rule would silently cover the corpus`
                )
            }
            for (const pattern of ['README.md', '**/__tests__/**', '**/*.spec.ts']) {
              if (coversCorpus(pattern, probes))
                return fail(`coversCorpus treats the safe exclusion ${pattern} as covering the corpus`)
            }

            return ok(undefined)
          })
      }))
    )
