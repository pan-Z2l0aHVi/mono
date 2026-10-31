/**
 * 把编排事件映射成任务板动作。
 *
 * 数据源是 orchestrator 的 tool result：`herdr_plan` 给出切片数量与 ledger，`herdr_dispatch`
 * 给出 worker 名与角色，`herdr_watch` 给出 worker 的终态，`herdr_review` 给出 slice 与
 * verdict。映射规则：
 *
 * - plan 获批：不建任务（那时还没有 worker，切片名也不在 details 里）
 * - dispatch：为该 slice 建任务，状态 `in_progress`
 * - watch done：移到 `in_review`——worker 说完了，等验收；很多 slice 不经 review 就结束，
 *   这一步让看板反映真实进度
 * - watch blocked / timeout / lost：留在 `in_progress`，把原因追加到描述里
 * - review APPROVE：移到 `in_review`
 * - review REJECT / RE_PLAN：退回 `todo`，描述里写上拒绝原因
 *
 * 这里只做纯计算，不碰文件也不调工具：动作由 `bridge.ts` 通过 `task_board` 工具执行。
 */

/** 任务板的状态闭集，与 pi-task-board v2 对齐。 */
export type BoardStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review'

/**
 * 动作来源意图。
 *
 * `kind` 在执行层会因「不存在就创建」而保留 `add_task`，合并后无法再区分这条动作最初是谁产生的。
 * 回退保护需要这个区分：只有 `review` 的结论可以把任务往回退（REJECT / RE_PLAN），
 * `dispatch` 建的 `add_task` 与 `watch` 的终态都只反映进度，不能把板上更新的状态降级。
 */
export type BoardIntent = 'dispatch' | 'watch' | 'review'

/** 一次要执行的任务板动作。`title` 用作任务身份——pi-task-board 没有按标题查询的接口。 */
export type BoardAction = {
  readonly kind: 'add_task' | 'move_task'
  readonly title: string
  readonly status: BoardStatus
  readonly description?: string
  /** `move_task` 专用：把描述追加到任务已有描述之后，而不是整段替换。 */
  readonly appendDescription?: boolean
  /** 产生这条动作的事件来源；回退保护按它判断能否把任务打回更早的状态。 */
  readonly intent?: BoardIntent
}

/** dispatch 的 details 形状（只取用到的字段）。 */
interface DispatchDetails {
  action?: string
  name?: string
  role?: string
  pane?: string
  ledgerFile?: string
  status?: string
}

/** review 的 details 形状（只取用到的字段）。 */
interface ReviewBoardDetails {
  action?: string
  slice?: string
  verdict?: string
  reason?: string
}

/**
 * watch 的 details 形状（只取用到的字段）。
 *
 * 轮询过程中 orchestrator 会发 `waiting: true` 的中间态，它的 `status` 是 agent 的实时状态
 * （可能是 `blocked`），不是 watch 的终态——必须按 `waiting` 过滤掉。
 */
interface WatchBoardDetails {
  action?: string
  name?: string
  status?: string
  waiting?: boolean
}

/** watch 的终态里表示「卡住」的那几种，都留在 `in_progress` 并记录原因。 */
const WATCH_STUCK = new Set(['blocked', 'timeout', 'lost'])

/** 面板名固定，避免每次编排在 board 里堆一个新面板。 */
export const BOARD_PANEL_TITLE = 'orchestration'

/** 任务标题前缀，用来把编排任务与用户手建任务区分开。 */
const TITLE_PREFIX = 'slice:'

/** reviewer 模板的占位符（`<one or two sentences>` 之类）。它们不是内容。 */
const PLACEHOLDER = /^<.*>$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 规范化任务标题。同一 slice 的多次事件必须得到同一个标题，否则会重复建任务。 */
export function taskTitle(slice: string): string {
  return `${TITLE_PREFIX} ${slice.trim()}`
}

/** dispatch → 建任务并进入 `in_progress`。 */
export function boardActionForDispatch(details: unknown): BoardAction | undefined {
  if (!isRecord(details)) return undefined
  const value = details as DispatchDetails
  if (value.action !== 'dispatch') return undefined
  const name = value.name?.trim()
  if (!name) return undefined

  const aspects = [`role: ${value.role ?? 'unknown'}`]
  if (value.pane) aspects.push(`pane: ${value.pane}`)
  if (value.ledgerFile) aspects.push(`ledger: ${value.ledgerFile}`)

  return {
    kind: 'add_task',
    title: taskTitle(name),
    status: 'in_progress',
    description: aspects.join(' | '),
    intent: 'dispatch'
  }
}

/**
 * watch → 反映 worker 的终态。
 *
 * `done` 表示 worker 自己说完了，任务进 `in_review` 等人验收——很多 slice 到这里就结束，
 * 不走 `herdr_review`，所以这一步是看板反映真实进度的唯一来源。`blocked` / `timeout` /
 * `lost` 仍留在 `in_progress`，把原因追加到描述后面，用户能看出卡在哪。
 *
 * 描述只写 `watch: <status>`：`output` 是终端原文，可能很长，不适合塞进看板。
 */
export function boardActionForWatch(details: unknown): BoardAction | undefined {
  if (!isRecord(details)) return undefined
  const value = details as WatchBoardDetails
  if (value.action !== 'watch') return undefined
  // 轮询中间态的 status 是 agent 实时状态，不是终态。
  if (value.waiting === true) return undefined
  const name = value.name?.trim()
  if (!name) return undefined

  const status = value.status?.trim().toLowerCase()
  if (status === 'done') {
    return { kind: 'move_task', title: taskTitle(name), status: 'in_review', intent: 'watch' }
  }
  if (status && WATCH_STUCK.has(status)) {
    return {
      kind: 'move_task',
      title: taskTitle(name),
      status: 'in_progress',
      description: `watch: ${status}`,
      appendDescription: true,
      intent: 'watch'
    }
  }
  return undefined
}

/**
 * review → 移动任务。
 *
 * `APPROVE` 进 `in_review`（等人验收），`REJECT` / `RE_PLAN` 退回 `todo` 并带上原因。
 * `UNKNOWN` 不动：它表示没解析出结论，挪动任务只会掩盖问题。
 */
export function boardActionForReview(
  details: unknown,
  resolved?: { verdict?: string; reason?: string }
): BoardAction | undefined {
  if (!isRecord(details)) return undefined
  const value = details as ReviewBoardDetails
  if (value.action !== 'review') return undefined
  const slice = value.slice?.trim()
  if (!slice) return undefined

  const verdict = (resolved?.verdict ?? value.verdict ?? 'UNKNOWN').toUpperCase()
  // `details.reason` 常是 reviewer 模板的占位符（`<one or two sentences>`），调用方应传
  // 从 review 文件解析出的真实 reason；没有时才退回 details。
  const reason = (resolved?.reason ?? value.reason)?.trim()
  if (reason && PLACEHOLDER.test(reason)) {
    return boardActionForReview(details, { verdict, reason: '' })
  }

  if (verdict === 'APPROVE') {
    return {
      kind: 'move_task',
      title: taskTitle(slice),
      status: 'in_review',
      ...(reason ? { description: `review approved: ${reason}` } : {}),
      intent: 'review'
    }
  }
  if (verdict === 'REJECT' || verdict === 'RE_PLAN') {
    return {
      kind: 'move_task',
      title: taskTitle(slice),
      status: 'todo',
      description: `${verdict}: ${reason || '(no reason recorded)'}`,
      intent: 'review'
    }
  }
  return undefined
}

/**
 * 桥接自己追加的 watch 原因行。
 *
 * 只认整行 `watch: <stuck>`：`boardActionForWatch` 写入的内容就是这个形状。reviewer 的
 * reason、用户备注里以 `watch:` 开头的行（`watch: my own note`、`watch: blocked because X`）
 * 都不是桥接写的，必须原样保留。
 */
const WATCH_REASON_LINE = new RegExp(`^\\s*watch:\\s*(?:${[...WATCH_STUCK].join('|')})\\s*$`, 'i')

/**
 * 去掉描述里由 watch 追加的原因行。
 *
 * `watch: blocked` 一类原因描述的是 worker 当时的终态；状态一旦推进（done / review），
 * 这些行就过期了。dispatch 写的 role / pane / ledger 行不属于原因，保留。带后缀的
 * `watch:` 行按非桥接内容处理，保留——见 `WATCH_REASON_LINE`。
 */
export function withoutWatchReasons(description: string | undefined): string | undefined {
  if (!description) return undefined
  return description
    .split('\n')
    .filter(line => !WATCH_REASON_LINE.test(line))
    .join('\n')
    .trim()
}

/**
 * 合成同一 slice 的旧动作与新动作的描述。
 *
 * - 追加语义（watch 的卡住原因）：旧描述在前、新原因在后，dispatch 写的元信息不丢；同一条
 *   slice 上一轮的原因已经被新原因取代，先去掉再拼，避免 blocked 与 timeout 同时挂在板上。
 * - 新动作没带描述：状态没变就沿用旧描述；状态变了，追加过的 watch 原因已经过期，清掉它，
 *   dispatch 的元信息保留。
 * - 默认整段替换：review 的结论比 dispatch 的元信息更值得留在板上。
 */
function mergeDescriptions(previous: BoardAction, action: BoardAction): string | undefined {
  const added = action.description?.trim()
  if (added) {
    if (!action.appendDescription) return action.description
    const kept = withoutWatchReasons(previous.description)
    return kept ? `${kept}\n${added}` : added
  }
  if (!previous.description) return undefined
  if (action.status === previous.status) return previous.description
  return withoutWatchReasons(previous.description)
}

/**
 * 把新动作并入待执行队列。
 *
 * 同一 slice 在队列里只保留**一个**动作，且状态取最新的：`dispatch`（in_progress）之后紧跟
 * `review`（in_review）时，队列里最终只有一条 in_review。这一步放在入队时做，是因为
 * dispatch 与 review 的 `tool_result` 可能在同一个 flush 之前连续触发——那时上一次的写还没
 * 落盘，靠「执行时查重」查不到，会建出两条任务。
 *
 * 保留 `add_task` 的语义（队列里第一次见到该 slice）交给执行层决定：执行层统一按「存在就
 * 移动、不存在就创建」处理，所以这里只需要最新的状态与描述。
 */
export function enqueueBoardAction(queue: BoardAction[], action: BoardAction): void {
  const index = queue.findIndex(item => item.title === action.title)
  if (index === -1) {
    queue.push(action)
    return
  }
  const previous = queue[index]
  if (!previous) return
  // 状态可能回退（REJECT 把 in_review 打回 todo），所以永远以最新动作为准。
  // 描述按 mergeDescriptions 的语义合成：追加动作不再覆盖 dispatch 写的 role/pane/ledger。
  const description = mergeDescriptions(previous, action)
  // 合并出来的描述已经是完整内容（旧描述已含在内），执行层整段替换即可；
  // 只有旧动作没有描述可合并时，才让执行层读板上已有描述再追加。
  const append = action.appendDescription === true && !previous.description
  // 意图跟着最新动作走：合并后的状态与描述都取最新动作的，回退许可也应由它决定。
  // dispatch + review REJECT 合并后 kind 仍是 add_task，但 intent 是 review——执行层的回退保护
  // 靠这个字段把「review 的结论」和「陈旧的 dispatch」区分开，否则 REJECT 会被整条吞掉。
  const intent = action.intent ?? previous.intent
  queue[index] = {
    kind: previous.kind === 'add_task' && action.kind === 'move_task' ? 'add_task' : action.kind,
    title: action.title,
    status: action.status,
    ...(description ? { description } : {}),
    ...(append ? { appendDescription: true } : {}),
    ...(intent ? { intent } : {})
  }
}
