import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

import type { WebUiToast } from './toast'
import type {
  ToastCloseReason,
  ToastInstanceOptions,
  ToastMessageUpdateOptions,
  ToastOptions,
  ToastPosition
} from './types'

let toastIdCounter = 0

const toastContainers = new Set<HTMLElement>()
const visibleToasts = new Map<string, WebUiToast>()

let pendingBatch: Array<{ id: string; options: ToastInstanceOptions; container: HTMLElement }> | undefined
let isBatchScheduled = false

type ToastShortcutOptions = Omit<ToastOptions, 'message' | 'type'> & Pick<ToastInstanceOptions, 'position'>

function generateId(): string {
  return `toast-${++toastIdCounter}`
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
    mountToast(item.id, item.options, item.container)
    containersToScroll.add(item.container)
  }
  for (const container of containersToScroll) scrollToBottom(container)
}

function createToast(options: ToastInstanceOptions): string {
  const id = options.id || generateId()
  if (visibleToasts.has(id)) return id

  const position = options.position || 'top-right'
  const targetTheme = options.target ? findNearestTheme(options.target) : findRootTheme()
  const root = options.container ?? targetTheme?.getOverlayRoot() ?? getFallbackOverlayRoot()
  const container = ensureContainer(position, root)

  if (!pendingBatch) pendingBatch = []
  pendingBatch.push({ id, options, container })
  scheduleBatchFlush()
  return id
}

function mountToast(id: string, options: ToastInstanceOptions, container: HTMLElement) {
  const el = document.createElement('web-ui-toast') as WebUiToast
  el.toastId = id
  el.type = options.type || 'info'
  el.position = options.position || 'top-right'
  el.heading = options.heading || ''
  el.message = options.message
  el.duration = options.duration ?? 3000
  el.closable = options.closable ?? true

  el.addEventListener('toast-close', (e: Event) => {
    const detail = (e as CustomEvent<{ id: string; reason: ToastCloseReason }>).detail
    removeToast(detail.id)
  })

  container.appendChild(el)
  visibleToasts.set(id, el)
  requestAnimationFrame(() => el.show())
}

function removeToast(id: string) {
  const el = visibleToasts.get(id)
  if (!el) return
  el.remove()
  visibleToasts.delete(id)
}

function close(id: string) {
  visibleToasts.get(id)?.dismiss('programmatic')
}

function clear() {
  for (const el of visibleToasts.values()) el.dismiss('clear')
}

/**
 * 更新指定 Toast 的消息与可选标题，不影响其自动关闭倒计时。
 * 尚未完成批量挂载的 Toast 也会更新其初始内容。
 */
function updateMessage(id: string, options: ToastMessageUpdateOptions) {
  const visibleToast = visibleToasts.get(id)
  if (visibleToast) {
    visibleToast.message = options.message
    if (options.heading !== undefined) visibleToast.heading = options.heading
    return
  }

  const pendingToast = pendingBatch?.find(item => item.id === id)
  if (!pendingToast) return
  pendingToast.options.message = options.message
  if (options.heading !== undefined) pendingToast.options.heading = options.heading
}

function toast(options: ToastInstanceOptions): string {
  return createToast(options)
}

toast.success = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'success' })
toast.info = (message: string, options?: ToastShortcutOptions) => createToast({ ...options, message, type: 'info' })
toast.warning = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'warning' })
toast.error = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'error', duration: options?.duration ?? 5000 })
toast.close = close
toast.clear = clear
toast.updateMessage = updateMessage

/** 获取当前可见 toast 数量（测试用） */
toast._visibleCount = () => visibleToasts.size

/** 重置全部状态（测试用） */
toast._reset = () => {
  pendingBatch = undefined
  isBatchScheduled = false
  for (const el of visibleToasts.values()) el.remove()
  visibleToasts.clear()
  for (const container of toastContainers) container.remove()
  toastContainers.clear()
}

export { toast }
