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

import { BOARD_PANEL_TITLE, taskTitle, withoutWatchReasons, type BoardAction, type BoardStatus } from './sync'

/** 与 `bridge.ts` 的 `callToolVia` 同形：只回 `{ ok, text }`。 */
export type BoardToolCaller = (name: string, args: Record<string, unknown>) => Promise<{ ok: boolean; text: string }>

interface PanelTask {
  readonly id: string
  readonly title: string
  readonly status?: string
  readonly description?: string
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
    const description = (item as { description?: unknown }).description
    if (typeof id !== 'string' || typeof title !== 'string') continue
    result.push({
      id,
      title,
      ...(typeof status === 'string' ? { status } : {}),
      ...(typeof description === 'string' ? { description } : {})
    })
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
 * 算出要写进任务的描述。
 *
 * 默认整段替换（review 的结论比 dispatch 的元信息更值得留在板上）。`append` 为真时把新行
 * 接在已有描述后面，并跳过已经出现过的那一行——watch 可能对同一 slice 重复上报同一原因。
 */
export function appendedDescription(existing: string | undefined, added: string, append: boolean): string {
  const current = existing?.trim()
  if (!append || !current) return added
  const line = added.trim()
  if (current.split('\n').some(item => item.trim() === line)) return current
  return `${current}\n${line}`
}

/**
 * 推进方向上的状态顺序。除 review 意图外，动作只沿这个方向移动，回退只能由 review 的结论触发。
 */
const STATUS_ORDER: readonly BoardStatus[] = ['backlog', 'todo', 'in_progress', 'in_review']

/** 状态在推进方向上的位置；板上出现了不认识的状态时返回 `undefined`。 */
function statusRank(status: string | undefined): number | undefined {
  if (!status) return undefined
  const index = STATUS_ORDER.findIndex(item => item === status)
  return index === -1 ? undefined : index
}

/**
 * 这条动作是否会把任务往回退。
 *
 * 队列里的动作要等下一次 flush 才执行，期间 watch 的 `done` 可能已经把任务推到
 * `in_review`。此时仍留在队里的 `add_task(in_progress)` 按「状态不等就移动」执行，会把任务
 * 打回 `in_progress`。`add_task` 表达的是「这个 slice 开始干活了」，不是「把它打回去」，所以
 * 它只推进。
 *
 * watch 的卡住终态（blocked / timeout / lost）同理：它是 `move_task(in_progress)`，描述的是
 * worker **当时**的状态。板上已经 `in_review` 时这条事件是陈旧的——既不该把任务降级，也不该
 * 把 `watch: blocked` 追加到一个等验收的任务上，误导用户以为它卡住了。所以整条动作 no-op。
 *
 * 判据是动作来源意图而不是 kind：dispatch + review 在队列里会合并成一条 `add_task(todo)`
 * （kind 必须保留 `add_task` 才能「不存在就创建」），按 kind 判断会把 review 的结论误当成
 * 陈旧 dispatch。`intent === 'review'` 的动作永远允许回退（REJECT / RE_PLAN 可以打回 todo）；
 * 其余意图只沿状态序前进。板上状态不认识时无法比较，维持原来的移动行为。
 */
function regresses(action: BoardAction, current: string | undefined): boolean {
  if (action.intent === 'review') return false
  const from = statusRank(current)
  const to = statusRank(action.status)
  return from !== undefined && to !== undefined && to < from
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

  // 过期动作保持板上现状：既不移动，也不拿动作里的旧描述覆盖板上当前描述（那会把 review
  // 的结论或已经推进的状态顶掉）。带 review 意图的动作不在此列——它就是来改状态的。
  const regressed = regresses(action, existing.status)
  const target = regressed ? existing.status : action.status

  // 状态已经一致也要跑一次 dedupe：上一轮可能已经产生了重复。
  if (existing.status !== target) {
    const moved = await call('task_board', {
      action: 'move_task',
      taskId: existing.id,
      status: target
    })
    if (!moved.ok) return { ok: false, detail: moved.text }
  }

  // `move_task` 不接受 description，用 update_task 补写描述。
  // - 追加语义（watch 的卡住原因）：先去掉板上过期的 watch 原因，再把新原因接在 role /
  //   ledger 行后面；同一原因重复上报时不重复追加。
  // - 新动作没有描述但状态变了：追加过的 watch 原因已经过期，清掉它，其余元信息保留。
  if (!regressed) {
    let description: string | undefined
    if (action.description) {
      const base = action.appendDescription === true ? withoutWatchReasons(existing.description) : existing.description
      description = appendedDescription(base, action.description, action.appendDescription === true)
    } else if (existing.status !== target) {
      description = withoutWatchReasons(existing.description)
    }
    if (description !== undefined && description !== existing.description) {
      await call('task_board', {
        action: 'update_task',
        taskId: existing.id,
        description
      })
    }
  }

  await dedupe(call, action.title)
  return { ok: true, detail: `${existing.id} -> ${target}` }
}

export { taskTitle }
export type { BoardStatus }
