import fs from 'node:fs'
import path from 'node:path'

import { readJsonFile } from '../shared/config.mjs'
import { byCodeUnit } from '../shared/order.mjs'

// `packages/web-ui` 是唯一「文档语料住在被发布包里」的包：那批示例 md 是 build 与 test 的
// 真输入。根 turbo.json 的 `!**/*.md` 把这批 md 排掉，包级 turbo.json 必须重新纳入，并按名字
// 排掉散文 md。本检查守两个方向：包里每篇 md 都在名单里；覆写后的排除项不会盖回 docs/ 语料。
export const name = 'web-ui-docs-inputs'

const PACKAGE_DIR = 'packages/web-ui'
const CORPUS_DIR = 'docs'
const PROSE_NAMES = ['README.md', 'README.CN.md', 'AGENTS.md', 'CHANGELOG.md']

function collectMarkdown(directory, base, files) {
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

function globToRegExp(glob) {
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
function coversCorpus(pattern, probes) {
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

function requireInputs(task, taskName) {
  if (!task || typeof task !== 'object') throw new Error(`turbo.json is missing tasks.${taskName}`)
  if (!Array.isArray(task.inputs))
    throw new Error(
      `tasks.${taskName}.inputs is missing or not an array: the package-level override replaces the root definition`
    )
  if (task.inputs.length === 0) throw new Error(`tasks.${taskName}.inputs is empty: the docs corpus leaves the hash`)
  for (const item of task.inputs) {
    if (typeof item !== 'string') throw new Error(`tasks.${taskName}.inputs must contain only strings`)
  }
  return task.inputs
}

export async function run({ root }) {
  const packageRoot = path.join(root, PACKAGE_DIR)
  if (!fs.existsSync(packageRoot)) throw new Error(`${PACKAGE_DIR} does not exist (run from the repository root)`)
  const corpusRoot = path.join(packageRoot, CORPUS_DIR)
  if (!fs.existsSync(corpusRoot)) throw new Error(`${PACKAGE_DIR}/${CORPUS_DIR}/ does not exist: this check would idle`)

  const allMarkdown = []
  collectMarkdown(packageRoot, packageRoot, allMarkdown)
  allMarkdown.sort(byCodeUnit)
  if (allMarkdown.length === 0) throw new Error(`${PACKAGE_DIR} contains no Markdown: this check would idle`)

  const corpusMarkdown = allMarkdown.filter(file => file.startsWith(`${CORPUS_DIR}/`))
  if (corpusMarkdown.length === 0)
    throw new Error(`${PACKAGE_DIR}/${CORPUS_DIR}/ contains no Markdown: this check would idle`)

  const strays = allMarkdown.filter(file => {
    if (file.startsWith(`${CORPUS_DIR}/`)) return false
    if (PROSE_NAMES.includes(file)) return false
    return !`/${file}/`.includes('/__tests__/')
  })
  if (strays.length > 0)
    throw new Error(
      `these Markdown files are not in the allowlist and would silently become build inputs of ${PACKAGE_DIR}:\n` +
        `${strays.map(file => `  ${file}`).join('\n')}\n` +
        `put prose Markdown in the excluded names (and update this check's PROSE_NAMES), or move it under ${PACKAGE_DIR}/${CORPUS_DIR}/`
    )

  const missingProse = PROSE_NAMES.filter(file => !fs.existsSync(path.join(packageRoot, file)))
  if (missingProse.length > 0)
    throw new Error(`these allowlisted Markdown files are missing from the package: ${missingProse.join(', ')}`)

  const turboFile = path.join(packageRoot, 'turbo.json')
  if (!fs.existsSync(turboFile))
    throw new Error(`${PACKAGE_DIR}/turbo.json does not exist: without it the corpus is not an input to build or test`)
  /** @type {{ extends?: unknown, tasks?: Record<string, { inputs?: unknown }> }} */
  const turbo = readJsonFile(turboFile)
  if (JSON.stringify(turbo.extends) !== '["//"]')
    throw new Error(`${PACKAGE_DIR}/turbo.json extends must be ["//"], otherwise the override drops task definitions`)

  const probes = [...corpusMarkdown, CORPUS_DIR, `${CORPUS_DIR}/`]
  for (const taskName of ['build', 'test']) {
    const inputs = requireInputs(turbo.tasks?.[taskName], taskName)
    if (!inputs.includes('$TURBO_DEFAULT$'))
      throw new Error(
        `tasks.${taskName}.inputs is missing $TURBO_DEFAULT$: package files outside the list would leave the hash`
      )
    for (const rule of inputs) {
      if (rule.startsWith('!') && coversCorpus(rule.slice(1), probes))
        throw new Error(
          `tasks.${taskName}.inputs exclude rule !${rule.slice(1)} covers the ${CORPUS_DIR}/ corpus; excluded Markdown no longer affects the cache`
        )
    }
    for (const proseName of PROSE_NAMES) {
      if (!inputs.includes(`!${proseName}`))
        throw new Error(
          `tasks.${taskName}.inputs is missing !${proseName}: prose Markdown would become an input of this task again`
        )
    }
  }

  for (const pattern of ['/docs/**', '/**/*.md', '*.md', '**/docs/**', '**/docs', '**/**/docs/**']) {
    if (!coversCorpus(pattern, probes))
      throw new Error(
        `coversCorpus missed ${pattern}: normalization was removed and this rule would silently cover the corpus`
      )
  }
  for (const pattern of ['README.md', '**/__tests__/**', '**/*.spec.ts']) {
    if (coversCorpus(pattern, probes))
      throw new Error(`coversCorpus treats the safe exclusion ${pattern} as covering the corpus`)
  }

  return `${corpusMarkdown.length} corpus files in the hash`
}
