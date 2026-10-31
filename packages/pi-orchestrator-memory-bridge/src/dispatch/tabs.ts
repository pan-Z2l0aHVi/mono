/**
 * worker / reviewer 的独立 tab。
 *
 * orchestrator 的 `splitWorkerPane()` 固定 `pane split --current --direction right`，没有
 * layout 选项也不允许 fork，所以「每个 worker 一个 tab」只能在拿到 tool result 之后把它的
 * pane 移走。移动失败一律降级成通知：dispatch 本身已经成功，tab 布局不该让它变成错误。
 *
 * 源 tab 处于 zoom 时 herdr 拒绝移动；这时先 `pane zoom --off` 再重试一次。每次 dispatch 只
 * 触发一次移动，且移动成功后 worker 已不在原 tab，所以取消 zoom 不会反复打断用户视图。
 *
 * label 带 slice 名：dispatch 的 `details.name` 就是 slice 名；review 的 `details.name` 是
 * reviewer agent 名（如 `review-round8`），用户要看的是被审的 slice，所以优先 `details.slice`。
 */

/** `herdr pane move` 的结果。失败只带原因，不 throw。 */
export interface PaneMoveOutcome {
  readonly moved: boolean
  /** herdr 给出的原因（`error.reason` / `error.code` / `error.message`）。 */
  readonly reason?: string
  /** 源 tab 处于 zoom，herdr 拒绝移动；取消 zoom 自身失败时也为 true（tab 仍处于 zoom）。 */
  readonly zoomed?: boolean
  /** 为分离 tab 执行过 `pane zoom --off` 且成功；重试之后仍是 `moved` 说了算。 */
  readonly zoomCleared?: boolean
}

/** `herdr pane zoom <pane> --off` 的结果。失败只带原因，不 throw。 */
export interface PaneZoomClearOutcome {
  readonly cleared: boolean
  /** herdr 给出的原因（`error.reason` / `error.code` / `error.message`）。 */
  readonly reason?: string
}

/** tab 移动与取消 zoom 的注入点：生产由 `herdr-cli.ts` 装配，测试用假实现。 */
export interface TabMoverDeps {
  readonly movePane: (paneId: string, label: string) => Promise<PaneMoveOutcome>
  readonly clearPaneZoom: (paneId: string) => Promise<PaneZoomClearOutcome>
}

/** 一次要执行的 tab 移动。 */
export interface TabMoveRequest {
  readonly paneId: string
  readonly label: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/** `herdr pane move` 的参数；单列出来供测试断言，避免用字符串拼接掩盖参数错误。 */
export function paneMoveArgs(paneId: string, label: string): string[] {
  return ['pane', 'move', paneId, '--new-tab', '--label', label, '--no-focus']
}

/** `herdr pane zoom` 取消 zoom 的参数；与 move 用同一个 paneId。 */
export function paneZoomOffArgs(paneId: string): string[] {
  return ['pane', 'zoom', paneId, '--off']
}

/**
 * 从 dispatch / review 的 tool result details 里取 tab 移动请求。
 *
 * 只认终态（`action` 匹配且带 `pane`）；轮询中间态、其他工具、缺 pane 都返回 undefined。
 */
export function tabMoveRequestFor(toolName: string, details: unknown): TabMoveRequest | undefined {
  if (!isRecord(details)) return undefined
  const paneId = nonEmptyString(details.pane)
  if (!paneId) return undefined

  if (toolName === 'herdr_dispatch') {
    if (details.action !== 'dispatch') return undefined
    const name = nonEmptyString(details.name)
    if (!name) return undefined
    return { paneId, label: `slice: ${name}` }
  }

  if (toolName === 'herdr_review') {
    if (details.action !== 'review') return undefined
    const label = nonEmptyString(details.slice) ?? nonEmptyString(details.name)
    if (!label) return undefined
    return { paneId, label: `review: ${label}` }
  }

  return undefined
}

/**
 * 解析 `herdr pane move` 的 JSON 输出。
 *
 * 成功响应是 `{result:{move_result:...}}`；失败是 `{error:{code,message,...}}`，zoomed 拒绝
 * 可能在 `code`、`reason` 或 `message` 里出现 `zoomed_tab`，所以对整个错误对象做匹配，
 * 不假设字段位置。
 */
export function parsePaneMoveResult(stdout: string): PaneMoveOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    const text = stdout.trim()
    return { moved: false, reason: text || 'herdr pane move: unparsable output' }
  }

  if (!isRecord(parsed)) return { moved: false, reason: 'herdr pane move: unexpected output' }

  if (parsed.error !== undefined) {
    // zoomed 拒绝可能在 error.code / error.reason / error.message 或顶层 reason 里；对整个
    // 响应匹配一次，不假设它落在一个字段上。
    const zoomed = /zoomed_tab/i.test(stdout)
    const error = parsed.error
    let reason: string | undefined
    if (isRecord(error)) {
      reason = nonEmptyString(error.reason) ?? nonEmptyString(error.code) ?? nonEmptyString(error.message)
    } else if (typeof error === 'string') {
      reason = error.trim() || undefined
    }
    reason ??= nonEmptyString(parsed.reason) ?? nonEmptyString(parsed.code)
    if (zoomed) return { moved: false, reason: reason ?? 'zoomed_tab', zoomed: true }
    return { moved: false, ...(reason === undefined ? {} : { reason }) }
  }

  if (!('result' in parsed)) return { moved: false, reason: 'herdr pane move: no result in output' }
  return { moved: true }
}

/**
 * 解析 `herdr pane zoom <pane> --off` 的 JSON 输出。
 *
 * 成功响应带 `result`（含 `zoom_changed` / `zoomed`），失败是 `{error:{...}}`，与 move 同构，
 * 所以复用同一套原因提取。有 `result` 即视为取消成功：`--off` 对未 zoom 的 pane 是无操作。
 */
export function parsePaneZoomOffResult(stdout: string): PaneZoomClearOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(stdout)
  } catch {
    const text = stdout.trim()
    return { cleared: false, reason: text || 'herdr pane zoom --off: unparsable output' }
  }

  if (!isRecord(parsed)) return { cleared: false, reason: 'herdr pane zoom --off: unexpected output' }

  if (parsed.error !== undefined) {
    const error = parsed.error
    let reason: string | undefined
    if (isRecord(error)) {
      reason = nonEmptyString(error.reason) ?? nonEmptyString(error.code) ?? nonEmptyString(error.message)
    } else if (typeof error === 'string') {
      reason = error.trim() || undefined
    }
    reason ??= nonEmptyString(parsed.reason) ?? nonEmptyString(parsed.code)
    return { cleared: false, ...(reason === undefined ? {} : { reason }) }
  }

  if (!('result' in parsed)) return { cleared: false, reason: 'herdr pane zoom --off: no result in output' }
  return { cleared: true }
}

/**
 * 把 pane 移到新 tab；源 tab zoomed 时先取消 zoom 再重试一次。
 *
 * 只重试一次：取消 zoom 后仍被拒（例如布局竞态）就如实返回，不循环。
 * - 重试成功 → `{ moved: true, zoomCleared: true }`
 * - 取消成功但重试失败 → 重试结果 + `zoomCleared: true`
 * - 取消失败 → `{ moved: false, zoomed: true, zoomCleared: false, reason: <zoom 命令的原因> }`
 */
export async function movePaneClearingZoom(
  deps: TabMoverDeps,
  paneId: string,
  label: string
): Promise<PaneMoveOutcome> {
  const first = await deps.movePane(paneId, label)
  if (first.moved || !first.zoomed) return first

  const cleared = await deps.clearPaneZoom(paneId)
  if (!cleared.cleared) {
    return {
      moved: false,
      reason: cleared.reason ?? 'herdr pane zoom --off failed',
      zoomed: true,
      zoomCleared: false
    }
  }

  const retry = await deps.movePane(paneId, label)
  return { ...retry, zoomCleared: true }
}
