/**
 * Rex CLI 封装。
 *
 * 命令经 `pi.exec`（创建 block、投递、读取、对账都是一次性命令）；只有 `rex events`
 * 是长驻流，用 `node:child_process` 直接 spawn，便于逐行消费。所有派生命令都以
 * `/usr/bin/env PI_REX_ORCH=0` 前缀透传防递归（Rex 是 C/S 架构且 `rex run` 没有
 * `--env` 参数，在 `pi.exec` 里传 env 到不了子 PTY）。
 *
 * 失败不静默：每条命令都保留 stderr 与退出码，报错文本里带原始输出片段。
 */

import { spawn } from 'node:child_process'

import type { PiExecOptions, PiExecResult } from './pi-types'
import { parseBlockList, parseRunResult, type RexBlockInfo, type RexRunResult, type StatusChange } from './rex-events'

export type RexExec = (command: string, args: string[], options?: PiExecOptions) => Promise<PiExecResult>

export interface RexAdapterDeps {
  exec: RexExec
  /** rex 可执行；缺省按 `$REX_BIN_DIR/rex` 优先，回退 PATH 上的 `rex`。 */
  bin?: string
  /** 目标会话；必填。 */
  session: string
  /** 长驻事件流用；缺省 `node:child_process` 的 `spawn`。 */
  spawnFn?: typeof spawn
}

/** 防递归前缀；`rex run` 的命令段开头。 */
const ENV_PREFIX = ['/usr/bin/env', 'PI_REX_ORCH=0']

export function resolveRexBin(env: { REX_BIN_DIR?: string }): string {
  return env.REX_BIN_DIR ? `${env.REX_BIN_DIR}/rex` : 'rex'
}

/** 包一层 `/usr/bin/env PI_REX_ORCH=0`，保证 worker 子进程不会递归激活协调者。 */
export function withAntiRecursionPrefix(binary: string, args: readonly string[]): string[] {
  return [...ENV_PREFIX, binary, ...args]
}

function fail(operation: string, result: PiExecResult): Error {
  const detail = (result.stderr || result.stdout).trim().slice(0, 400)
  return new Error(`rex ${operation} 失败（exit ${result.code}${result.killed ? ', killed' : ''}）: ${detail}`)
}

export interface RunBlockOptions {
  cwd: string
  label: string
  keepOpen: boolean
  focus: boolean
  /** 追加 `--interactive` 读取 shell 交互配置（PATH 依赖 `~/.zshrc` 的 CLI 需要）。 */
  interactiveShell?: boolean
  /** 完整命令段（已含二进制与参数）。 */
  commandSegments: readonly string[]
}

export class RexAdapter {
  private readonly exec: RexExec
  readonly bin: string
  readonly session: string
  private readonly spawnFn: typeof spawn

  constructor(deps: RexAdapterDeps) {
    this.exec = deps.exec
    this.bin = deps.bin ?? 'rex'
    this.session = deps.session
    this.spawnFn = deps.spawnFn ?? spawn
  }

  /** 创建一个终端 block 并返回其 id；命令派发不经 login shell 的交互配置。 */
  async runBlock(options: RunBlockOptions): Promise<RexRunResult> {
    const args = [
      'run',
      '-s',
      this.session,
      '-c',
      options.cwd,
      '--label',
      options.label,
      ...(options.keepOpen ? ['--keep-open'] : []),
      ...(options.interactiveShell === true ? ['--interactive'] : []),
      ...(options.focus ? [] : ['--focus=false']),
      '--json',
      '--',
      ...options.commandSegments
    ]
    const result = await this.exec(this.bin, args, { timeout: 15000 })
    if (result.code !== 0) throw fail('run', result)
    return parseRunResult(result.stdout)
  }

  async send(blockId: string, text: string): Promise<void> {
    const result = await this.exec(this.bin, ['send', '-s', this.session, '-b', blockId, text], { timeout: 10000 })
    if (result.code !== 0) throw fail('send', result)
  }

  async sendKey(blockId: string, key: string): Promise<void> {
    const result = await this.exec(this.bin, ['send-key', '-s', this.session, '-b', blockId, key], { timeout: 10000 })
    if (result.code !== 0) throw fail('send-key', result)
  }

  /** 读取 block 屏幕与回滚区；`tailLines` > 0 时只取末尾若干行。 */
  async capture(blockId: string, tailLines?: number): Promise<string> {
    const result = await this.exec(this.bin, ['capture', '-s', this.session, '-b', blockId, '--trim', '--unwrap'], {
      timeout: 15000,
      maxBuffer: 8 * 1024 * 1024
    })
    if (result.code !== 0) throw fail('capture', result)
    if (tailLines === undefined || tailLines <= 0) return result.stdout
    return result.stdout.split('\n').slice(-tailLines).join('\n')
  }

  async blockList(): Promise<RexBlockInfo[]> {
    const result = await this.exec(this.bin, ['block', 'ls', '-s', this.session, '--short=false', '--json'], {
      timeout: 15000
    })
    if (result.code !== 0) throw fail('block ls', result)
    return parseBlockList(result.stdout)
  }

  /** 调 block 方法；`program_status` 返回状态记录数组。 */
  async blockCallProgramStatus(blockId: string): Promise<StatusChange[]> {
    const result = await this.exec(this.bin, ['block', 'call', '-s', this.session, '-b', blockId, 'program_status'], {
      timeout: 15000
    })
    if (result.code !== 0) {
      // block 刚关闭或归属变更时 call 会失败；调用方按「状态未知」处理，不在这里吞错。
      throw fail('block call program_status', result)
    }
    return parseProgramStatus(result.stdout)
  }

  /**
   * `rex block call process` 的 `last_exit`（实测为 `{last_exit:{exit_code,error}|null}`）。
   * `--keep-open` 的 headless Block 在子进程退出后仍存活，靠它在对账时补 `child_exited`。
   */
  async blockCallLastExit(blockId: string): Promise<number | undefined> {
    const result = await this.exec(this.bin, ['block', 'call', '-s', this.session, '-b', blockId, 'process'], {
      timeout: 15000
    })
    if (result.code !== 0) throw fail('block call process', result)
    let parsed: unknown
    try {
      parsed = JSON.parse(result.stdout)
    } catch {
      throw new Error(`process 输出不是合法 JSON: ${result.stdout.slice(0, 200)}`)
    }
    const lastExit =
      typeof parsed === 'object' && parsed !== null ? (parsed as { last_exit?: unknown }).last_exit : undefined
    if (typeof lastExit !== 'object' || lastExit === null) return undefined
    const exitCode = (lastExit as { exit_code?: unknown }).exit_code
    return typeof exitCode === 'number' ? exitCode : undefined
  }

  async blockClose(blockId: string): Promise<void> {
    const result = await this.exec(this.bin, ['block', 'close', '-s', this.session, blockId], { timeout: 10000 })
    if (result.code !== 0) throw fail('block close', result)
  }

  /**
   * 启动长驻 `rex events --json` 流。返回控制句柄：`onLine` 逐行收到原始 JSON，
   * `onExit` 在流断开时收到原因。进程退出钩子由调用方（orchestrator）负责挂，
   * 这里只保证 stdin 关闭时子进程随之退出。stderr 不直通宿主终端（SIGTERM 收尾的
   * "Error: interrupted" 是噪声），但也不丢弃：保留最后 2 KB，随 `onExit` 的错误
   * 上浮，重连告警里能看到 Rex server 不可用之类的真实原因。
   */
  startEventsStream(handlers: { onLine(line: string): void; onExit(error: Error | undefined): void }): {
    kill(): void
  } {
    const child = this.spawnFn(this.bin, ['events', '-s', this.session, '--json'], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    let buffer = ''
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      buffer += chunk
      let newline = buffer.indexOf('\n')
      while (newline !== -1) {
        const line = buffer.slice(0, newline)
        buffer = buffer.slice(newline + 1)
        handlers.onLine(line)
        newline = buffer.indexOf('\n')
      }
    })
    let stderrTail = ''
    child.stderr?.setEncoding('utf8')
    child.stderr?.on('data', (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2048)
    })
    // spawn 失败会先发 `error` 再发 `close`：不做一次性保护会安排两个重连定时器。
    let exited = false
    const exitOnce = (error: Error | undefined): void => {
      if (exited) return
      exited = true
      handlers.onExit(error)
    }
    child.on('error', error => exitOnce(error))
    child.on('close', (code, signal) => {
      if (code === 0 || signal === 'SIGTERM') {
        exitOnce(undefined)
        return
      }
      const detail = stderrTail.trim().slice(-400)
      exitOnce(
        new Error(
          `rex events 退出（code=${code ?? 'null'} signal=${signal ?? 'null'}${detail === '' ? '' : `：${detail}`}`
        )
      )
    })
    // stdin EOF 即退出：服务端断开时子进程不会残留。
    child.stdin?.end()
    return { kill: () => child.kill('SIGTERM') }
  }
}

/** `rex block call program_status` 的响应（实测为 `{records:[{state,app,msg,...}]}`）。 */
function parseProgramStatus(stdout: string): StatusChange[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    throw new Error(`program_status 输出不是合法 JSON: ${stdout.slice(0, 200)}`)
  }
  const records =
    typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { records?: unknown }).records)
      ? ((parsed as { records: unknown[] }).records as unknown[])
      : []
  const changes: StatusChange[] = []
  for (const record of records) {
    if (typeof record !== 'object' || record === null) continue
    const entry = record as Record<string, unknown>
    if (typeof entry.state !== 'string') continue
    changes.push({
      // 事件形态里 id 是 OSC 状态记录 id；call 响应里没有对应字段，用 app 兜底。
      id: typeof entry.app === 'string' ? entry.app : 'unknown',
      record: {
        state: entry.state,
        kind: typeof entry.kind === 'string' ? entry.kind : undefined,
        msg: typeof entry.msg === 'string' ? entry.msg : undefined,
        app: typeof entry.app === 'string' ? entry.app : undefined,
        updatedAt: typeof entry.updated_at === 'string' ? entry.updated_at : undefined
      }
    })
  }
  return changes
}
