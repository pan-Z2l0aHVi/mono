/**
 * 任务板摘要读取。
 *
 * 读 `pi-task-board` 落在 `<cwd>/.pi/task-board.json` 的文件，而不是调它的 `task_board`
 * 工具：注入发生在 `before_agent_start`，那里的 ctx 没有 `executeTool`，调不到别的扩展的
 * 工具。
 *
 * 于是这里承担一个明确风险：耦合它的文件 schema（`version: 2`）。缓解方式是「不认识就
 * 当作没有」——版本不符、字段缺失、JSON 损坏、文件不存在全部返回 undefined，桥接扩展随后
 * 只注入记忆。board 是加分项，不是前提。
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import type { BoardSummary } from '../contracts'

/** 与 pi-task-board v2 对齐的本地形状；任何字段对不上就整份丢弃。 */
const SUPPORTED_VERSION = 2
const MAX_ITEMS = 12

/** pi-task-board 的状态闭集。集合外的状态不计数也不展示。 */
const STATUSES = new Set(['backlog', 'todo', 'in_progress', 'in_review'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * pi-task-board 的文件位置。
 *
 * 与 `pi-task-board` 自己保持一致，取 **cwd** 的 `.pi/task-board.json`，不取主 checkout 的：
 * 写入经 `task_board` 工具落盘，而那个工具把存储固定在 `ctx.cwd`（`pi-task-board` 没有
 * path 参数）。在 linked worktree 里两者是不同的路径，读侧若直接指向主 checkout，就会读不到
 * 本会话刚写进去的任务——用户在 `/board` 里看到的进度与桥接注入的摘要会永远是两份。
 *
 * 跨 worktree 共享由文件系统层完成：`ensureSharedBoard`（`share.ts`）把 worktree 的 `.pi`
 * 链接到主 checkout 的 `.pi`，所以这里仍然只认 cwd，路径一致性与共享互不冲突。
 */
export function boardPath(cwd: string): string {
  return join(cwd, '.pi', 'task-board.json')
}

/**
 * 选出要摘要的面板。
 *
 * 优先 `lastPanelId`（用户最后打开的那个），否则第一个有任务的面板，再否则第一个面板。
 * 返回 undefined 表示没有可展示的面板。
 */
function pickPanel(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  const panels = raw.panels
  if (!Array.isArray(panels)) return undefined
  const candidates = panels.filter(isRecord)
  if (candidates.length === 0) return undefined

  const lastPanelId = typeof raw.lastPanelId === 'string' ? raw.lastPanelId : undefined
  if (lastPanelId) {
    const last = candidates.find(panel => panel.id === lastPanelId)
    if (last) return last
  }
  const withTasks = candidates.find(panel => Array.isArray(panel.tasks) && panel.tasks.length > 0)
  return withTasks ?? candidates[0]
}

/**
 * 解析 board 文件。
 *
 * 任务按状态计数，`in_progress` / `in_review` 的条目优先列出——那是编排者最需要盯的两列。
 */
export function parseBoard(raw: unknown): BoardSummary | undefined {
  if (!isRecord(raw)) return undefined
  if (raw.version !== SUPPORTED_VERSION) return undefined
  const panel = pickPanel(raw)
  if (!panel) return undefined

  const tasks = Array.isArray(panel.tasks) ? panel.tasks.filter(isRecord) : []
  const counts: Record<string, number> = {}
  const items: Array<{ id: string; title: string; status: string }> = []

  for (const task of tasks) {
    const id = typeof task.id === 'string' ? task.id : undefined
    const title = typeof task.title === 'string' ? task.title : undefined
    const status = typeof task.status === 'string' ? task.status : undefined
    if (!id || !title || !status) continue
    if (!STATUSES.has(status)) continue
    counts[status] = (counts[status] ?? 0) + 1
    items.push({ id, title, status })
  }

  const active = items.filter(item => item.status === 'in_progress' || item.status === 'in_review')
  const rest = items.filter(item => item.status !== 'in_progress' && item.status !== 'in_review')

  return {
    panel: typeof panel.name === 'string' ? panel.name : '(unnamed panel)',
    counts,
    items: [...active, ...rest].slice(0, MAX_ITEMS)
  }
}

/**
 * 读 board 摘要；任何失败都折算成 undefined。
 *
 * 这里刻意不区分「没装 board」和「文件坏了」：两者对注入的结论相同（不注入 board 段），
 * 而区分需要往会话里报错，反而违反「board 不可用时静默降级」。
 */
export async function readBoardSummary(cwd: string): Promise<BoardSummary | undefined> {
  let text: string
  try {
    text = await readFile(boardPath(cwd), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return undefined
  }
  return parseBoard(parsed)
}
