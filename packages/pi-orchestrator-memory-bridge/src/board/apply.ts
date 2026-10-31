/**
 * 通过 `task_board` 工具执行任务板动作。
 *
 * 不直接写 `.pi/task-board.json`：pi-task-board 的 guidelines 明确禁止，而且它自己用文件锁
 * 与原子 rename 维护一致性，外部直写会绕过这两样。
 *
 * 两个由对方契约带来的约束，决定了这里的形状：
 *
 * 1. `move_task` 只接受 `taskId`，而编排侧只有 slice 名。所以每次动作前要 `get_panel` 读一次
 *    面板，把标题映射成 id。
 * 2. `add_task` **不去重**。桥接在 `tool_result` 里工作，dispatch 与 review 可能在同一轮里
 *    连续触发，上一轮的建任务还没落盘就去查，会查不到而重复建。所以建完之后要重读确认，
 *    把同标题的冗余任务清掉——代价是一次额外读取，换的是看板上不会出现两条同一 slice。
 */

import { BOARD_PANEL_TITLE, taskTitle, type BoardAction, type BoardStatus } from './sync'

/** 与 `bridge.ts` 的 `callToolVia` 同形：只回 `{ ok, text }`。 */
export type BoardToolCaller = (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; text: string }>

interface PanelTask {
  readonly id: string
  readonly title: string
  readonly status?: string
}

/**
 * 从 `get_panel` 的 JSON 输出里取任务列表。
 *
 * 输出是 `JSON.stringify({ id, name, description, tasks })`；解析失败返回空数组，让调用方
 * 退化成「当作没有任务」而不是抛错——board 是加分项。
 */
export function parsePanelTasks(text: string): PanelTask[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  if (typeof parsed !== 'object' || parsed === null) return []
  const tasks = (parsed as { tasks?: unknown }).tasks
  if (!Array.isArray(tasks)) return []
  const result: PanelTask[] = []
  for (const item of tasks) {
    if (typeof item !== 'object' || item === null) continue
    const id = (item as { id?: unknown }).id
    const title = (item as { title?: unknown }).title
    const status = (item as { status?: unknown }).status
    if (typeof id !== 'string' || typeof title !== 'string') continue
    result.push({ id, title, ...(typeof status === 'string' ? { status } : {}) })
  }
  return result
}

/** 面板名列表。`list_panels` 在空板上返回人类可读文案而不是 JSON，所以解析失败即无面板。 */
function parsePanelNames(text: string): string[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .map(item => (typeof item === 'object' && item !== null ? (item as { name?: unknown }).name : undefined))
    .filter((name): name is string => typeof name === 'string')
}

/** 确保面板存在；返回失败原因。 */
async function ensurePanel(call: BoardToolCaller): Promise<{ ok: boolean; detail: string }> {
  const listed = await call('task_board', { action: 'list_panels' })
  if (!listed.ok) return { ok: false, detail: listed.text }

  const exists = parsePanelNames(listed.text).some(name => name.toLowerCase() === BOARD_PANEL_TITLE.toLowerCase())
  if (exists) return { ok: true, detail: `panel ${BOARD_PANEL_TITLE} exists` }

  const created = await call('task_board', { action: 'add_panel', title: BOARD_PANEL_TITLE })
  return { ok: created.ok, detail: created.text }
}

/** 读面板里的全部任务。 */
async function readTasks(call: BoardToolCaller): Promise<PanelTask[]> {
  const panel = await call('task_board', { action: 'get_panel', panel: BOARD_PANEL_TITLE })
  if (!panel.ok) return []
  return parsePanelTasks(panel.text)
}

/**
 * 读完面板后删除同标题的冗余任务。
 *
 * `add_task` 不去重，而 dispatch 与 review 可能在上一轮写入落盘前连续查两次。留下最小 id
 * 的那条（最早创建的），删掉其余，保证板上一 slice 一行。
 */
async function dedupe(call: BoardToolCaller, title: string): Promise<void> {
  const sameTitle = (await readTasks(call))
    .filter(task => task.title === title)
    .sort((left, right) => numericId(left.id) - numericId(right.id))
  for (const extra of sameTitle.slice(1)) {
    await call('task_board', { action: 'delete_task', taskId: extra.id })
  }
}

/** 从 `T-12` 取 12；无法解析时排到最前，让它成为被保留的那条。 */
function numericId(id: string): number {
  const match = /^T-(\d+)$/i.exec(id.trim())
  return match?.[1] ? Number(match[1]) : -1
}

/** 找标题对应的任务；同标题多余条目按最早创建的那条算。 */
function pickExisting(tasks: readonly PanelTask[], title: string): PanelTask | undefined {
  return tasks.filter(task => task.title === title).sort((left, right) => numericId(left.id) - numericId(right.id))[0]
}

/**
 * 执行一个 board 动作。
 *
 * 两条路径都以「最终板上一 slice 一行、状态为目标状态」为准，而不是「恰好发了几次调用」。
 */
export async function applyBoardAction(
  call: BoardToolCaller,
  action: BoardAction
): Promise<{ ok: boolean; detail: string }> {
  const panel = await ensurePanel(call)
  if (!panel.ok) return { ok: false, detail: panel.detail }

  const existing = pickExisting(await readTasks(call), action.title)

  if (!existing) {
    const created = await call('task_board', {
      action: 'add_task',
      panel: BOARD_PANEL_TITLE,
      title: action.title,
      status: action.status,
      ...(action.description ? { description: action.description } : {})
    })
    if (!created.ok) return { ok: false, detail: created.text }
    await dedupe(call, action.title)
    return { ok: true, detail: created.text }
  }

  // 状态已经一致也要跑一次 dedupe：上一轮可能已经产生了重复。
  if (existing.status !== action.status) {
    const moved = await call('task_board', {
      action: 'move_task',
      taskId: existing.id,
      status: action.status
    })
    if (!moved.ok) return { ok: false, detail: moved.text }
  }

  if (action.description) {
    // `move_task` 不接受 description，用 update_task 补写原因。
    await call('task_board', {
      action: 'update_task',
      taskId: existing.id,
      description: action.description
    })
  }

  await dedupe(call, action.title)
  return { ok: true, detail: `${existing.id} -> ${action.status}` }
}

export { taskTitle }
export type { BoardStatus }
