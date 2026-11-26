// Shared GitHub Actions runtime I/O and CLI dispatcher for `.github/scripts/*.mjs`.
// Pure Node ESM with zero external dependencies (ADR-0014 / ADR-0021).
import fs from 'node:fs'
import os from 'node:os'

/**
 * 将任意值折叠为单行文本；传入 `maxLength` 时按字符长度截断并追加省略号。
 *
 * @param {string | number | boolean | null | undefined} value
 * @param {number} [maxLength]
 * @returns {string}
 */
export function oneLine(value, maxLength) {
  const single = String(value ?? '')
    .replace(/\s+/gu, ' ')
    .trim()
  if (typeof maxLength === 'number' && single.length > maxLength) {
    return `${single.slice(0, maxLength)}…`
  }
  return single
}

function normalizeSummary(content) {
  const raw = Array.isArray(content) ? content.join('\n') : String(content ?? '')
  return raw.trimEnd().replace(/\r?\n/gu, os.EOL)
}

const ALLOWED_ANNOTATION_LEVELS = new Set(['debug', 'notice', 'warning', 'error'])

function escapeCommandData(value) {
  return String(value ?? '')
    .replace(/%/gu, '%25')
    .replace(/\r/gu, '%0D')
    .replace(/\n/gu, '%0A')
}

function escapeCommandProperty(value) {
  return escapeCommandData(value).replace(/:/gu, '%3A').replace(/,/gu, '%2C')
}

function formatAnnotation(level, title, message) {
  const safeLevel = ALLOWED_ANNOTATION_LEVELS.has(level) ? level : 'notice'
  const heading = title ? ` title=${escapeCommandProperty(oneLine(title))}` : ''
  return `::${safeLevel}${heading}::${escapeCommandData(oneLine(message))}`
}

/**
 * 创建面向真实 GitHub Actions 运行时（env / GITHUB_OUTPUT / GITHUB_STEP_SUMMARY / stdio）的运行时适配器。
 *
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {string} [options.cwd]
 * @param {(line: string) => void} [options.stdout]
 * @param {(line: string) => void} [options.stderr]
 * @param {(line: string) => void} [options.warn]
 * @param {(code: number) => void} [options.setExitCode]
 * @param {() => number | undefined} [options.getExitCode]
 */
export function createActionsRuntime({
  env = process.env,
  cwd = process.cwd(),
  stdout = line => console.log(line),
  stderr = line => console.error(line),
  warn = line => console.warn(line),
  setExitCode = code => {
    process.exitCode = code
  },
  getExitCode = () => process.exitCode
} = {}) {
  const requireEnv = names =>
    Object.fromEntries(
      names.map(name => {
        const value = env[name]
        if (value === undefined || value === '') throw new Error(`${name} is missing`)
        return [name, value]
      })
    )

  const writeOutputs = values => {
    const target = env.GITHUB_OUTPUT
    if (!target || !target.trim()) return
    const entries = Object.entries(values)
    if (entries.length === 0) return
    const body = entries.map(([key, value]) => `${key}=${oneLine(value)}`).join('\n')
    fs.appendFileSync(target, `${body}\n`)
  }

  const appendSummary = content => {
    const target = env.GITHUB_STEP_SUMMARY
    if (!target || !target.trim()) return
    const normalized = normalizeSummary(content)
    if (!normalized) return
    fs.appendFileSync(target, `${normalized}${os.EOL}`)
  }

  const annotate = (level, title, message) => {
    stdout(formatAnnotation(level, title, message))
  }

  return {
    env,
    cwd,
    requireEnv,
    writeOutputs,
    appendSummary,
    annotate,
    log: stdout,
    warn,
    error: stderr,
    setExitCode,
    getExitCode
  }
}

/**
 * 创建内存态 ActionsRuntime，用于进程内单元测试而无需读写临时文件或污染 `process.env`。
 *
 * @param {object} [options]
 * @param {Record<string, string | undefined>} [options.env]
 * @param {string} [options.cwd]
 */
export function createMemoryActionsRuntime({ env = {}, cwd = '/repo' } = {}) {
  const resolvedEnv = { ...env }
  /** @type {Record<string, string>} */
  const outputs = {}
  /** @type {string[]} */
  const summaries = []
  /** @type {string[]} */
  const logs = []
  /** @type {string[]} */
  const warnings = []
  /** @type {string[]} */
  const errors = []
  /** @type {Array<{ level: string, title: string, message: string, line: string }>} */
  const annotations = []
  /** @type {number | undefined} */
  let exitCode

  const requireEnv = names =>
    Object.fromEntries(
      names.map(name => {
        const value = resolvedEnv[name]
        if (value === undefined || value === '') throw new Error(`${name} is missing`)
        return [name, value]
      })
    )

  const writeOutputs = values => {
    for (const [key, value] of Object.entries(values)) {
      outputs[key] = oneLine(value)
    }
  }

  const appendSummary = content => {
    const raw = Array.isArray(content) ? content.join('\n') : String(content ?? '')
    const trimmed = raw.trimEnd()
    if (!trimmed) return
    summaries.push(trimmed)
  }

  const annotate = (level, title, message) => {
    const line = formatAnnotation(level, title, message)
    annotations.push({ level, title: title ?? '', message: oneLine(message), line })
    logs.push(line)
  }

  return {
    env: resolvedEnv,
    cwd,
    requireEnv,
    writeOutputs,
    appendSummary,
    annotate,
    log: line => logs.push(String(line)),
    warn: line => warnings.push(String(line)),
    error: line => errors.push(String(line)),
    setExitCode: code => {
      exitCode = code
    },
    getExitCode: () => exitCode,
    outputs,
    summaries,
    logs,
    warnings,
    errors,
    annotations
  }
}

/**
 * 统一子命令分发入口。
 *
 * @param {Record<string, (context: { runtime: ReturnType<typeof createActionsRuntime>, args: string[] }) => unknown>} commands
 * @param {object} [options]
 * @param {string[]} [options.argv]
 * @param {string} [options.scriptName]
 * @param {ReturnType<typeof createActionsRuntime>} [options.runtime]
 */
export function runCli(
  commands,
  { argv = process.argv.slice(2), scriptName = '', runtime = createActionsRuntime() } = {}
) {
  const [name, ...rest] = argv
  const handler = name ? commands[name] : undefined
  if (!handler) {
    const label = scriptName ? `node ${scriptName}` : 'script'
    throw new Error(`usage: ${label} <${Object.keys(commands).join('|')}>`)
  }
  return handler({ runtime, args: rest })
}
