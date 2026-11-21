/**
 * `rex_cli` 的 argv 适配层。
 *
 * 模型只提交参数数组，真正的子进程经注入的 `exec` 执行；这里不拼 shell 字符串。
 * `rex events` 是长驻流，由 orchestrator 自己的事件环消费，不能走一次性 exec。
 */

import { basename } from 'node:path'

import type { PiExecOptions, PiExecResult, PiToolResult } from './pi-types'
import type { RexExec } from './rex-adapter'

const DEFAULT_TIMEOUT_MS = 15000
const CAPTURE_MAX_BUFFER = 8 * 1024 * 1024
const STDERR_TAIL_CHARS = 2000
const STDOUT_MAX_LINES = 200
const STDOUT_MAX_CHARS = 16000
const WORKER_AGENT_BINARIES = new Set(['claude', 'codex', 'pi'])
const SEPARATED_COMMAND_SUBCOMMANDS = new Set(['new', 'run', 'split'])
const GLOBAL_VALUE_FLAGS = new Set(['-S', '--server', '-C', '--client', '--color', '--timeout'])
const GLOBAL_BOOLEAN_FLAGS = new Set(['-v', '--verbose', '--autostart'])
const GLOBAL_EQUALS_VALUE_FLAGS = new Set(['--server', '--client', '--color', '--timeout', '--verbose', '--autostart'])
const GLOBAL_ATTACHED_VALUE_FLAG_PREFIXES = ['-S', '-C'] as const
const ROOT_DISCOVERY_FLAGS = new Set(['-h', '--help', '--version'])
/**
 * 自动注入 `-s` 的命令清单。
 *
 * 来源：2026-11-21 真机 `--help` 实测。它是本扩展的注入策略，不是 Rex CLI 事实全集；
 * 升级 Rex 后先重新枚举，再同步清单与测试。
 */
const SESSION_INJECTION_COMMANDS = new Set([
  'run',
  'split',
  'do',
  'send',
  'send-key',
  'capture',
  'focus',
  'zoom',
  'move',
  'swap',
  'wait',
  'block ls',
  'block list',
  'block inspect',
  'block focus',
  'block send',
  'block send-key',
  'block capture',
  'block zoom',
  'block move',
  'block swap',
  'block call',
  'block rename',
  'block close',
  'window ls',
  'window list',
  'window new',
  'window inspect',
  'window focus',
  'window move',
  'window rename',
  'window close',
  'client ls',
  'client list',
  'api call',
  'forward new',
  'forward open',
  'forward share',
  'forward ls',
  'forward list',
  'forward close',
  'fwd new',
  'fwd open',
  'fwd share',
  'fwd ls',
  'fwd list',
  'fwd close'
])

export interface RexCliDeps {
  exec: RexExec
  bin: string
  session: string
}

function text(text: string, isError = false): PiToolResult {
  return { content: [{ type: 'text', text }], isError }
}

type SubcommandPosition = { index: number } | { discovery: true } | { error: string }

function parseSubcommand(args: readonly string[]): SubcommandPosition {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) return { error: '参数数组意外结束' }
    if (!arg.startsWith('-')) {
      return arg.trim() === '' ? { error: '子命令不能为空' } : { index }
    }
    if (arg === '--') return { error: '`--` 之前没有实际子命令' }
    if (ROOT_DISCOVERY_FLAGS.has(arg)) {
      return index === args.length - 1 ? { discovery: true } : { error: `根自查 flag ${arg} 后不能再跟参数` }
    }
    if (GLOBAL_BOOLEAN_FLAGS.has(arg) || /^-v+$/.test(arg)) continue
    if (GLOBAL_VALUE_FLAGS.has(arg)) {
      const value = args[index + 1]
      if (value === undefined || value.trim() === '' || value.startsWith('-')) {
        return { error: `全局 flag ${arg} 缺少值` }
      }
      index += 1
      continue
    }
    if (arg.startsWith('--') && arg.includes('=')) {
      const separator = arg.indexOf('=')
      const flag = arg.slice(0, separator)
      const value = arg.slice(separator + 1)
      if (GLOBAL_EQUALS_VALUE_FLAGS.has(flag)) {
        if (value.trim() === '') return { error: `全局 flag ${flag} 缺少值` }
        continue
      }
    }
    const attachedFlag = GLOBAL_ATTACHED_VALUE_FLAG_PREFIXES.find(prefix => arg.startsWith(prefix))
    if (attachedFlag !== undefined) {
      const attachedValue = arg.slice(attachedFlag.length)
      const value = attachedValue.startsWith('=') ? attachedValue.slice(1) : attachedValue
      if (value.trim() === '') return { error: `全局 flag ${attachedFlag} 缺少值` }
      continue
    }
    return { error: `无法识别子命令前的 flag ${arg}` }
  }
  return { error: '没有解析到实际子命令' }
}

function hasExplicitSession(args: readonly string[], subcommandIndex: number): boolean {
  const separator = args.indexOf('--')
  const rexArgs = separator === -1 ? args : args.slice(0, separator)
  return rexArgs.slice(subcommandIndex).some(arg => arg === '-s' || arg === '--session' || arg.startsWith('--session='))
}

function sessionCommand(args: readonly string[], subcommandIndex: number): string {
  const first = args[subcommandIndex]
  const second = args[subcommandIndex + 1]
  if (first === undefined) return ''
  if (second !== undefined && !second.startsWith('-')) {
    const compound = `${first} ${second}`
    if (SESSION_INJECTION_COMMANDS.has(compound)) return compound
  }
  return first
}

function sessionArgs(args: readonly string[], session: string, subcommandIndex: number): string[] {
  if (
    !SESSION_INJECTION_COMMANDS.has(sessionCommand(args, subcommandIndex)) ||
    hasExplicitSession(args, subcommandIndex)
  ) {
    return [...args]
  }
  const separator = args.indexOf('--')
  if (separator === -1) return [...args, '-s', session]
  return [...args.slice(0, separator), '-s', session, ...args.slice(separator)]
}

function commandSegment(args: readonly string[], subcommandIndex: number): readonly string[] {
  const subcommand = args[subcommandIndex]
  if (subcommand === 'do') return args.slice(subcommandIndex + 1)

  const launchesSeparatedCommand =
    SEPARATED_COMMAND_SUBCOMMANDS.has(subcommand ?? '') ||
    (subcommand === 'window' && args[subcommandIndex + 1] === 'new')
  if (!launchesSeparatedCommand) return []

  const separator = args.indexOf('--', subcommandIndex + 1)
  return separator === -1 ? [] : args.slice(separator + 1)
}

/**
 * 静态检查 argv 中的 worker-agent 启动。
 *
 * 只覆盖 `do`，以及 `new` / `run` / `split` / `window new` 的 `--` 命令段；
 * `send` / `send-key` / `block call ... write` 的文本和 `bash -lc '...'` 等
 * shell 包装不在静态检测范围，由 prompt 的硬性路由要求约束。
 */
function rejectsWorkerAgent(args: readonly string[], subcommandIndex: number): boolean {
  return commandSegment(args, subcommandIndex).some(token => WORKER_AGENT_BINARIES.has(basename(token)))
}

function timeoutOptions(subcommand: string): PiExecOptions {
  if (subcommand === 'send' || subcommand === 'send-key') return { timeout: 10000 }
  if (subcommand === 'capture') return { timeout: DEFAULT_TIMEOUT_MS, maxBuffer: CAPTURE_MAX_BUFFER }
  return { timeout: DEFAULT_TIMEOUT_MS }
}

interface TruncatedStdout {
  text: string
  truncated: boolean
  truncation: 'none' | 'lines' | 'chars'
  shownLines: number
  totalLines: number
  totalChars: number
}

/** 先保留前 200 行，再在 16000 字符处截断；尾注本身不计入 stdout 上限。 */
export function truncateStdout(stdout: string): TruncatedStdout {
  const withoutTrailingNewline = stdout.endsWith('\n') ? stdout.slice(0, -1) : stdout
  const lines = withoutTrailingNewline === '' ? [] : withoutTrailingNewline.split('\n')
  const totalLines = lines.length
  let head = lines.slice(0, STDOUT_MAX_LINES).join('\n')
  let truncation: TruncatedStdout['truncation'] = 'none'
  if (lines.length > STDOUT_MAX_LINES) truncation = 'lines'
  if (head.length > STDOUT_MAX_CHARS) {
    head = head.slice(0, STDOUT_MAX_CHARS)
    truncation = 'chars'
  }
  return {
    text: truncation === 'none' ? stdout : head,
    truncated: truncation !== 'none',
    truncation,
    shownLines: truncation === 'none' ? totalLines : head === '' ? 0 : head.split('\n').length,
    totalLines,
    totalChars: stdout.length
  }
}

function renderResult(result: PiExecResult): PiToolResult {
  const stdout = truncateStdout(result.stdout)
  const lines = [stdout.text]
  if (stdout.truncation === 'lines') {
    lines.push(`[truncated: 显示 ${stdout.shownLines} / 共 ${stdout.totalLines} 行]`)
  } else if (stdout.truncation === 'chars') {
    lines.push(`[truncated: 字符上限 ${STDOUT_MAX_CHARS} / 原长 ${stdout.totalChars} 字符]`)
  }
  const stderr = result.code !== 0 ? result.stderr.slice(-STDERR_TAIL_CHARS) : result.stderr
  if (stderr !== '') lines.push('', '[stderr]', stderr)
  lines.push('', `[exit code: ${result.code}]`)
  if (result.killed) lines.push('[killed]')
  if (result.truncated) lines.push('[host output truncated]')
  return text(lines.join('\n'), result.code !== 0)
}

/**
 * 执行 `rex_cli` 的参数。参数以 unknown 接收，tool runtime 传入畸形 JSON 时也返回
 * 明确错误而不是启动子进程。
 */
export async function executeRexCli(args: unknown, deps: RexCliDeps): Promise<PiToolResult> {
  if (!Array.isArray(args) || args.length === 0 || !args.every(arg => typeof arg === 'string')) {
    return text('rex_cli 需要非空字符串数组 args，例如 ["window", "ls"]。', true)
  }

  const singleRootDiscovery = args.length === 1 && ROOT_DISCOVERY_FLAGS.has(args[0])
  const position = singleRootDiscovery ? undefined : parseSubcommand(args)
  if (position !== undefined && 'error' in position) {
    return text(
      `rex_cli 无法确定实际 Rex 子命令：${position.error}。请把子命令放在最前，或先 rex_cli(["--help"]) 自查全局 flag。`,
      true
    )
  }

  const discovery = singleRootDiscovery || (position !== undefined && 'discovery' in position)
  const subcommandIndex = position !== undefined && 'index' in position ? position.index : 0
  const subcommand = args[subcommandIndex] ?? args[0]
  if (subcommand === 'events') {
    return text(
      'rex_cli 不能执行长驻的 rex events：事件流由扩展内部消费。请用 rex_inspect_output 读取 worker 输出，或依赖现有事件环。',
      true
    )
  }
  if (!discovery && rejectsWorkerAgent(args, subcommandIndex)) {
    return text(
      'rex_cli 不能通过可启动命令的 Rex 子命令启动 claude、codex 或 pi；这个白名单只服务 worker 生命周期。请用 rex_spawn_agent 派生 worker。',
      true
    )
  }

  const finalArgs = discovery ? [...args] : sessionArgs(args, deps.session, subcommandIndex)
  try {
    return renderResult(await deps.exec(deps.bin, finalArgs, timeoutOptions(subcommand)))
  } catch (error) {
    return text(
      `rex_cli 执行失败：${error instanceof Error ? error.message : String(error)}。请根据错误修正 argv，可用 ["--help"] 自查。`,
      true
    )
  }
}
