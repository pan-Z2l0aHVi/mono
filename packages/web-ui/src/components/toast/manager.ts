import { getFallbackOverlayRoot } from '@/shared/overlay/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/overlay/theme-overlay-scope'

import type { WebUiToast } from './toast'
import type { ToastInstanceOptions, ToastOptions, ToastPosition } from './types'

let toastIdCounter = 0

const toastContainers = new Set<HTMLElement>()
const visibleToasts = new Map<string, WebUiToast>()

let pendingBatch: Array<{ id: string; options: ToastInstanceOptions; root: HTMLElement }> | undefined
let isBatchScheduled = false

type ToastShortcutOptions = Omit<ToastOptions, 'message' | 'type'> & Pick<ToastInstanceOptions, 'position'>

// moveBefore 尚未进入 Baseline，DOM lib 未必声明；按能力探测调用，缺失时走降级分支。
type MaybeMoveBefore = HTMLElement & { moveBefore?: (node: Node, child: Node | null) => void }

function generateId(): string {
  return `toast-${++toastIdCounter}`
}

function resolveRoot(options: ToastInstanceOptions): HTMLElement {
  const targetTheme = options.target ? findNearestTheme(options.target) : findRootTheme()
  return options.container ?? targetTheme?.getOverlayRoot() ?? getFallbackOverlayRoot()
}

function ensureContainer(position: ToastPosition, root: HTMLElement): HTMLElement {
  const existing = Array.from(root.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.wuiToastPosition === position
  )
  if (existing) return existing

  const container = document.createElement('div')
  container.className = `wui-toast-container wui-toast-${position}`
  container.dataset.wuiToastPosition = position
  container.setAttribute('role', 'log')
  container.setAttribute('aria-live', 'polite')
  container.setAttribute('aria-relevant', 'additions')
  root.appendChild(container)
  toastContainers.add(container)

  container.addEventListener('pointerenter', () => (container.dataset.hovered = 'true'))
  container.addEventListener('pointerleave', () => {
    delete container.dataset.hovered
    scrollToBottom(container)
  })
  return container
}

function pruneContainer(container: HTMLElement | null) {
  if (!container || container.children.length > 0) return
  container.remove()
  toastContainers.delete(container)
}

function scrollToBottom(container: HTMLElement) {
  if (container.dataset.hovered === 'true') return
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight
  })
}

function scheduleBatchFlush() {
  if (isBatchScheduled) return
  isBatchScheduled = true
  void Promise.resolve().then(flushBatch)
}

function flushBatch() {
  isBatchScheduled = false
  const batch = pendingBatch
  pendingBatch = undefined
  if (!batch) return

  const containersToScroll = new Set<HTMLElement>()
  for (const item of batch) {
    // 容器在挂载时才解析：待挂载条目被 patch 改了 position 也能落到正确容器。
    const container = ensureContainer(item.options.position || 'top-right', item.root)
    mountToast(item.id, item.options, container)
    containersToScroll.add(container)
  }
  for (const container of containersToScroll) scrollToBottom(container)
}

/**
 * 命令式 API 的 upsert 语义：指定同一个 id 的多次调用收敛到同一条 toast。
 * 给出的字段覆盖，未给出的保持原值；`container` 与 `target` 以首次为准，换 overlay root 牵连更广。
 */
function mergePatch(base: ToastInstanceOptions, patch: ToastInstanceOptions): ToastInstanceOptions {
  return {
    ...base,
    message: patch.message ?? base.message,
    heading: patch.heading ?? base.heading,
    type: patch.type ?? base.type,
    duration: patch.duration ?? base.duration,
    closable: patch.closable ?? base.closable,
    position: patch.position ?? base.position,
    container: base.container,
    target: base.target
  }
}

function applyPatch(el: WebUiToast, options: ToastInstanceOptions) {
  if (options.message !== undefined) el.message = options.message
  if (options.heading !== undefined) el.heading = options.heading
  if (options.type !== undefined) el.type = options.type
  if (options.closable !== undefined) el.noCloseButton = options.closable === false
  // duration 只有显式传入才重启计时；message/heading/type 都是 Lit 属性，赋值不碰 _closeTimer。
  if (options.duration !== undefined) {
    el.duration = options.duration
    el.startAutoClose()
  }
  if (options.position !== undefined && options.position !== el.position) relocateToast(el, options.position)
}

function relocateToast(el: WebUiToast, position: ToastPosition) {
  const prev = el.parentElement
  const root = prev?.parentElement
  if (!root) return
  const next = ensureContainer(position, root)

  const movable = next as MaybeMoveBefore
  if (typeof movable.moveBefore === 'function') {
    // 不摘出节点，disconnected/connected 都不触发：计时、焦点与动画状态原样保留。
    movable.moveBefore(el, null)
  } else {
    el.pauseAutoClose()
    next.appendChild(el)
    el.resumeAutoClose()
  }

  el.position = position
  pruneContainer(prev)
  scrollToBottom(next)
}

function createToast(options: ToastInstanceOptions): string {
  const id = options.id || generateId()

  const mounted = visibleToasts.get(id)
  if (mounted) {
    /*
     * 「已挂载但 show() 还没跑」的窗口（mountToast 之后、rAF 里的 show() 之前）仍复用同一条元素；
     * 正在退场、或被宿主摘出 DOM 的元素则不再接受更新。后者的补丁只会落在一条即将（或已经）
     * 离开文档的元素上：调用方拿到同一个 id，却没有任何可见通知，`relocateToast` 也会因
     * 找不到 root 而静默吞掉 position。因此摘掉映射、改走新建路径。
     * 退场元素仍在 DOM 里，由它自己延迟派发的 `toast-close` 收尾（按元素身份解绑，见 removeToastElement）。
     */
    if (mounted.isConnected && !mounted.dismissing) {
      applyPatch(mounted, options)
      return id
    }
    visibleToasts.delete(id)
  }

  const pending = pendingBatch?.find(item => item.id === id)
  if (pending) {
    pending.options = mergePatch(pending.options, options)
    return id
  }

  if (!pendingBatch) pendingBatch = []
  pendingBatch.push({ id, options, root: resolveRoot(options) })
  scheduleBatchFlush()
  return id
}

function mountToast(id: string, options: ToastInstanceOptions, container: HTMLElement) {
  const el = document.createElement('web-ui-toast')
  const type = options.type || 'info'
  el.toastId = id
  el.type = type
  el.position = options.position || 'top-right'
  el.heading = options.heading || ''
  el.message = options.message
  // error 的 5000 只在挂载时兜底，不写进 options：写进去 applyPatch 就会把它当成「显式传入
  // duration」而每次 upsert 都重启倒计时，与「duration 只有显式传入才重启」的契约冲突。
  el.duration = options.duration ?? (type === 'error' ? 5000 : 3000)
  el.noCloseButton = options.closable === false

  el.addEventListener('toast-close', () => removeToastElement(el))

  container.appendChild(el)
  visibleToasts.set(id, el)
  requestAnimationFrame(() => {
    // close()/clear() 可能已经在这段窗口里收走了它（见 dismiss 的无退场动画分支）：
    // 不再入场，否则一条孤儿元素会在 duration 之后补派一次同 id 的 toast-close。
    if (el.dismissing) return
    el.show()
  })
}

/**
 * 按元素身份解绑并移除。退场中的旧元素会在稍后派发 `toast-close`，而此刻同 id 可能已经有
 * 新元素（退场窗口内的 upsert 会新建一条）；若按 `detail.id` 删映射，就会把刚建好的那条
 * 一起删掉 —— 与「孤儿元素收不走」是同一类缺陷，只是换了个入口。
 */
function removeToastElement(el: WebUiToast) {
  if (visibleToasts.get(el.toastId) === el) visibleToasts.delete(el.toastId)
  const container = el.parentElement
  el.remove()
  pruneContainer(container)
}

/**
 * id 不在 Map 里时仍要清掉同 id 的残留节点：早先的按 id 删除路径在这里直接 return，
 * 重复挂载留下的孤儿 toast 因此连自关闭、close() 和 clear() 都收不走，会永久留在
 * role="log" 容器里。强删不派发 `toast-close`，但对不可从管理器触达的元素来说没有消费方状态可言。
 */
function removeStray(id: string) {
  for (const container of toastContainers) {
    for (const child of Array.from(container.children)) {
      if (child.tagName !== 'WEB-UI-TOAST') continue
      if ((child as Partial<WebUiToast>).toastId === id) child.remove()
    }
  }
  for (const container of Array.from(toastContainers)) pruneContainer(container)
}

/**
 * 关闭一个 id 时，「还没开始显示」的两种状态都要能取消，否则 close() 会静默失效：
 *
 * - 同 tick 仍在 `pendingBatch` 里：还不是 DOM 元素，`removeStray` 扫不到 —— 出队即取消挂载。
 * - 已 `flushBatch`、rAF 里的 `show()` 未跑：元素在映射里但 `visible` 仍是 false，
 *   `dismiss()` 现在对这段窗口立即派发（无退场动画可播），由 toast-close 监听摘除。
 *
 * 已在退场的元素不必也不该再动：它自己延迟派发的 toast-close 会收尾，重复 close 不改变结果。
 */
function close(id: string) {
  const queued = pendingBatch
  if (queued) {
    const index = queued.findIndex(item => item.id === id)
    if (index >= 0) {
      queued.splice(index, 1)
      return
    }
  }

  const el = visibleToasts.get(id)
  if (el) {
    el.dismiss('programmatic')
    return
  }
  removeStray(id)
}

/**
 * 队列条目与已挂载元素一起取消。二者都会在同一个微任务内落地，只遍历已挂载元素会让
 * 「clear() 之后仍冒出一条」成为唯一的例外 —— 与 close() 的可用范围对齐。
 */
function clear() {
  pendingBatch = undefined
  for (const el of visibleToasts.values()) el.dismiss('clear')
}

function toast(options: ToastInstanceOptions): string {
  return createToast(options)
}

toast.success = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'success' })
toast.info = (message: string, options?: ToastShortcutOptions) => createToast({ ...options, message, type: 'info' })
toast.warning = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'warning' })
// 不注入 duration：error 的 5000 默认值在 mountToast 兜底，否则 upsert 每次都判定为
// 「显式传入 duration」而重启倒计时（success/info/warning 都没有这个不对称）。
toast.error = (message: string, options?: ToastShortcutOptions) => createToast({ ...options, message, type: 'error' })
toast.close = close
toast.clear = clear

// 重置全部状态（测试用）
toast._reset = () => {
  pendingBatch = undefined
  isBatchScheduled = false
  for (const el of visibleToasts.values()) el.remove()
  visibleToasts.clear()
  for (const container of toastContainers) container.remove()
  toastContainers.clear()
}

export { toast }
