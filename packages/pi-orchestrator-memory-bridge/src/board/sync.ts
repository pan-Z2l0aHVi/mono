/**
 * 把编排事件映射成任务板动作。
 *
 * 数据源是 orchestrator 的 tool result：`herdr_plan` 给出切片数量与 ledger，`herdr_dispatch`
 * 给出 worker 名与角色，`herdr_review` 给出 slice 与 verdict。映射规则：
 *
 * - plan 获批：不建任务（那时还没有 worker，切片名也不在 details 里）
 * - dispatch：为该 slice 建任务，状态 `in_progress`
 * - review APPROVE：移到 `in_review`
 * - review REJECT / RE_PLAN：退回 `todo`，描述里写上拒绝原因
 *
 * 这里只做纯计算，不碰文件也不调工具：动作由 `bridge.ts` 通过 `task_board` 工具执行。
 */

/** 任务板的状态闭集，与 pi-task-board v2 对齐。 */
export type BoardStatus = 'backlog' | 'todo' | 'in_progress' | 'in_review'

/** 一次要执行的任务板动作。`title` 用作任务身份——pi-task-board 没有按标题查询的接口。 */
export type BoardAction =
  | { readonly kind: 'add_task'; readonly title: string; readonly status: BoardStatus; readonly description?: string }
  | { readonly kind: 'move_task'; readonly title: string; readonly status: BoardStatus; readonly description?: string }

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
    description: aspects.join(' | ')
  }
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
      ...(reason ? { description: `review approved: ${reason}` } : {})
    }
  }
  if (verdict === 'REJECT' || verdict === 'RE_PLAN') {
    return {
      kind: 'move_task',
      title: taskTitle(slice),
      status: 'todo',
      description: `${verdict}: ${reason || '(no reason recorded)'}`
    }
  }
  return undefined
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
  // 状态可能回退（REJECT 把 in_review 打回 todo），所以永远以最新动作为准。
  // 描述也以最新为准：review 的拒绝原因比 dispatch 的 role 更值得留在板上；
  // 新动作没带描述时保留旧的那条，避免 dispatch 写的 role/pane/ledger 被清空。
  const description = action.description ?? previous?.description
  queue[index] = {
    kind: previous?.kind === 'add_task' && action.kind === 'move_task' ? 'add_task' : action.kind,
    title: action.title,
    status: action.status,
    ...(description ? { description } : {})
  }
}
