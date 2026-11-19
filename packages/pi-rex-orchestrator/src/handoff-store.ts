/**
 * 按轮次持久化交接区：`~/.cache/pi-rex-orch/<pi-session-id>/`。
 *
 * 选 `~/.cache` 而不是 `/tmp`：避开符号链接陷阱，且跨 `/tmp` 清理周期存活。目录权限
 * 0700，只属于当前用户。`workers/<worker-id>/` 通过 `--add-dir` 只授权给该 worker；
 * `worktrees/<worker-id>/` 放可选的独立 git worktree。
 *
 * 轮次文件名固定三段式：`turn-NNN.brief.md`（协调者写）、`turn-NNN.handoff.md`
 * （worker 写的结构化交接结论）、`turn-NNN.events.jsonl`（headless 原始事件流落盘）。
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import path from 'node:path'

export interface HandoffStoreDeps {
  /** 根目录；缺省 `~/.cache/pi-rex-orch`。 */
  root?: string
  /** 协调者自身的 Pi session id；未知时用 `default`。 */
  sessionId: string
}

const DEFAULT_ROOT = path.join(homedir(), '.cache', 'pi-rex-orch')

/** 交接区根目录；prompt 注入与 /rex-status 用它描述路径。 */
export const HANDOFF_ROOT = DEFAULT_ROOT

function turnFile(turn: number, kind: 'brief' | 'handoff' | 'events'): string {
  const tag = kind === 'events' ? 'events.jsonl' : `${kind}.md`
  return `turn-${String(turn).padStart(3, '0')}.${tag}`
}

export class HandoffStore {
  readonly root: string
  private readonly sessionDir: string

  constructor(deps: HandoffStoreDeps) {
    this.root = deps.root ?? DEFAULT_ROOT
    this.sessionDir = path.join(this.root, deps.sessionId || 'default')
  }

  workerDir(workerId: string): string {
    return path.join(this.sessionDir, 'workers', workerId)
  }

  worktreeDir(workerId: string): string {
    return path.join(this.sessionDir, 'worktrees', workerId)
  }

  /** 建 0700 目录链；已存在且权限更宽时不动文件系统，只返回告警。 */
  async ensureWorkerDir(workerId: string): Promise<{ dir: string; warnings: string[] }> {
    const warnings: string[] = []
    const dir = this.workerDir(workerId)
    await mkdir(path.join(this.sessionDir, 'workers'), { recursive: true, mode: 0o700 })
    await mkdir(dir, { recursive: true, mode: 0o700 })
    const info = await stat(dir)
    if (info.mode & 0o077) {
      warnings.push(`handoff 目录权限过宽（${(info.mode & 0o777).toString(8)}），建议 chmod 700 ${dir}`)
    }
    return { dir, warnings }
  }

  briefPath(workerId: string, turn: number): string {
    return path.join(this.workerDir(workerId), turnFile(turn, 'brief'))
  }

  eventsPath(workerId: string, turn: number): string {
    return path.join(this.workerDir(workerId), turnFile(turn, 'events'))
  }

  handoffPath(workerId: string, turn: number): string {
    return path.join(this.workerDir(workerId), turnFile(turn, 'handoff'))
  }

  async writeBrief(workerId: string, turn: number, content: string): Promise<string> {
    const target = this.briefPath(workerId, turn)
    await writeFile(target, content, 'utf8')
    return target
  }

  async appendEvents(workerId: string, turn: number, chunk: string): Promise<string> {
    const target = this.eventsPath(workerId, turn)
    await writeFile(target, chunk, { flag: 'a' })
    return target
  }

  /** 读取某轮 handoff；缺失或空文件都返回 `missing`，不回退读旧轮次。 */
  async readHandoff(
    workerId: string,
    turn: number
  ): Promise<{ status: 'ok'; content: string } | { status: 'missing'; path: string }> {
    const target = this.handoffPath(workerId, turn)
    try {
      const content = await readFile(target, 'utf8')
      if (content.trim() === '') return { status: 'missing', path: target }
      return { status: 'ok', content }
    } catch {
      return { status: 'missing', path: target }
    }
  }

  async readEventsTail(workerId: string, turn: number, maxLines: number): Promise<string | undefined> {
    const content = await this.readEvents(workerId, turn)
    if (content === undefined) return undefined
    const lines = content.split('\n')
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    return lines.slice(-maxLines).join('\n')
  }

  /** 读整份事件落盘；续跑的 session id 提取用（codex 的 thread 记录在首行）。 */
  async readEvents(workerId: string, turn: number): Promise<string | undefined> {
    try {
      return await readFile(this.eventsPath(workerId, turn), 'utf8')
    } catch {
      return undefined
    }
  }

  async writeCaptureLog(workerId: string, content: string): Promise<string> {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const target = path.join(this.workerDir(workerId), `capture-${stamp}.log`)
    await writeFile(target, content, 'utf8')
    return target
  }
}
