import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'

import '@/components/icon'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { lucideCheck, lucideInfo, lucideTriangleAlert, lucideCircleAlert, heroiconsXMark16Solid } from '@/icons'
import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

import style from './style.css?inline'

export type ToastType = 'success' | 'info' | 'warning' | 'error'
export type ToastCloseReason = 'auto' | 'manual' | 'programmatic' | 'clear'
export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'

export interface ToastOptions {
  message: string
  type?: ToastType
  duration?: number
  closable?: boolean
  id?: string
  heading?: string
  /** 用于解析最近 web-ui-theme 的触发元素。 */
  target?: Element
  /** 显式挂载容器，优先级高于 target 和主题作用域。 */
  container?: HTMLElement
}

let toastIdCounter = 0

const TYPE_ICONS: Record<ToastType, IconifyIcon> = {
  success: lucideCheck,
  info: lucideInfo,
  warning: lucideTriangleAlert,
  error: lucideCircleAlert
}

function _formatTime(): string {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

@customElement('web-ui-toast')
export class WebUiToast extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) toastId = ''
  @property({ type: String, reflect: true }) type: ToastType = 'info'
  @property({ type: String, reflect: true }) position: ToastPosition = 'top-right'
  @property({ type: String }) heading = ''
  @property({ type: String }) message = ''
  @property({ type: Number }) duration = 3000
  @property({ type: Boolean, reflect: true }) closable = true
  @property({ type: Boolean, reflect: true }) visible = false

  private _closeTimer?: ReturnType<typeof setTimeout>

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('mouseenter', this._onMouseEnter)
    this.addEventListener('mouseleave', this._onMouseLeave)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('mouseenter', this._onMouseEnter)
    this.removeEventListener('mouseleave', this._onMouseLeave)
    this._clearTimer()
  }

  protected override updated(changed: PropertyValues) {
    if (changed.has('position')) {
      this._applySlideDirection()
    }
  }

  /** 根据 position 设置入场/退场滑动方向 */
  private _applySlideDirection() {
    const SLIDE_OFFSET = 20
    let x = 0
    let y = 0

    if (this.position.includes('left')) x = -SLIDE_OFFSET
    else if (this.position.includes('right')) x = SLIDE_OFFSET

    if (this.position.startsWith('top')) y = -SLIDE_OFFSET
    else if (this.position.startsWith('bottom')) y = SLIDE_OFFSET

    this.style.setProperty('--toast-slide-x', `${x}px`)
    this.style.setProperty('--toast-slide-y', `${y}px`)
  }

  /** 启动自动关闭计时器 */
  startAutoClose() {
    this._clearTimer()
    if (this.duration > 0) {
      this._closeTimer = setTimeout(() => {
        this.dismiss('auto')
      }, this.duration)
    }
  }

  /** 由 manager 调用：播放入场动画后自动开始计时 */
  show() {
    this.visible = true
    this.startAutoClose()
  }

  /** 关闭（含退场动画） */
  dismiss(reason: ToastCloseReason = 'programmatic') {
    if (!this.visible) return
    this.visible = false
    this._clearTimer()
    // 等退场动画结束再通知 manager 移除 DOM
    const onEnd = () => {
      this.removeEventListener('transitionend', onEnd)
      this._dispatchClose(reason)
    }
    this.addEventListener('transitionend', onEnd)
    // fallback：如果 transitionend 不触发（display:none 等）
    setTimeout(onEnd, 400)
  }

  private _clearTimer() {
    if (this._closeTimer !== undefined) {
      clearTimeout(this._closeTimer)
      this._closeTimer = undefined
    }
  }

  private _onMouseEnter = () => {
    this._clearTimer()
  }

  private _onMouseLeave = () => {
    this.startAutoClose()
  }

  private _onCloseClick = () => {
    this.dismiss('manual')
  }

  private _dispatchClose(reason: ToastCloseReason) {
    this.dispatchEvent(
      new CustomEvent('toast-close', {
        detail: { id: this.toastId, reason },
        bubbles: true,
        composed: true
      })
    )
  }

  override render() {
    const icon = TYPE_ICONS[this.type]
    const ariaLive = this.type === 'error' ? 'assertive' : 'polite'

    return html`
      <div
        class="toast wui-glass wui-glass-no-after ${this.type}"
        role="alert"
        aria-live=${ariaLive}
        aria-atomic="true"
      >
        <span class="toast-icon" aria-hidden="true">
          <web-ui-icon .icon=${icon} :size="18"></web-ui-icon>
        </span>
        <div class="toast-body">
          ${this.heading ? html`<div class="toast-heading">${this.heading}</div>` : html``}
          <div class="toast-message">${this.message}</div>
        </div>
        <span class="toast-time">${_formatTime()}</span>
        ${this.closable
          ? html`
              <button class="toast-close-btn wui-glass" aria-label="关闭" @click=${this._onCloseClick}>
                <web-ui-icon .icon=${heroiconsXMark16Solid} :size="10"></web-ui-icon>
              </button>
            `
          : html``}
      </div>
    `
  }
}

export interface WebUiToast {
  readonly $events: {
    'toast-close': CustomEvent<{ id: string; reason: ToastCloseReason }>
  }
  toastId: string
  type: ToastType
  position: ToastPosition
  heading: string
  message: string
  duration: number
  closable: boolean
  visible: boolean
  show(): void
  dismiss(reason?: ToastCloseReason): void
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-toast': WebUiToast
  }
}

/* ========== 命令式 API ========== */

export interface ToastInstanceOptions extends ToastOptions {
  position?: ToastPosition
}

function generateId(): string {
  return `toast-${++toastIdCounter}`
}

const toastContainers = new Set<HTMLElement>()

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

  // hover 时标记容器，暂停自动滚动
  container.addEventListener('mouseenter', () => (container.dataset.hovered = 'true'))
  container.addEventListener('mouseleave', () => {
    delete container.dataset.hovered
    // 离开时如果之前有被暂停的滚动，恢复滚到底部
    _scrollToBottom(container)
  })
  return container
}

/** 自动滚动容器到底部（仅在非 hover 状态） */
function _scrollToBottom(container: HTMLElement) {
  if (container.dataset.hovered === 'true') return
  // 用 requestAnimationFrame 确保 DOM 更新后再滚动
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight
  })
}

const visibleToasts = new Map<string, WebUiToast>()

/** 批量挂载队列：同一微任务内多次 createToast 只触发一次 DOM 批量挂载 */
let _pendingBatch: Array<{ id: string; options: ToastInstanceOptions; container: HTMLElement }> | null = null
let _batchScheduled = false

function _scheduleBatchFlush() {
  if (_batchScheduled) return
  _batchScheduled = true
  void Promise.resolve().then(_flushBatch)
}

function _flushBatch() {
  _batchScheduled = false
  const batch = _pendingBatch
  _pendingBatch = null
  if (!batch) return

  const containersToScroll = new Set<HTMLElement>()
  for (const item of batch) {
    _mountToast(item.id, item.options, item.container)
    containersToScroll.add(item.container)
  }
  // 批量挂载完成后，统一滚动每个涉及的容器
  for (const c of containersToScroll) {
    _scrollToBottom(c)
  }
}

function createToast(options: ToastInstanceOptions): string {
  const id = options.id || generateId()

  // 去重：同 id 不重复创建
  if (visibleToasts.has(id)) return id

  const position = options.position || 'top-right'
  const targetTheme = options.target ? findNearestTheme(options.target) : findRootTheme()
  const root = options.container ?? targetTheme?.getOverlayRoot() ?? getFallbackOverlayRoot()
  const container = ensureContainer(position, root)

  if (!_pendingBatch) _pendingBatch = []
  _pendingBatch.push({ id, options, container })
  _scheduleBatchFlush()
  return id
}

function _mountToast(id: string, options: ToastInstanceOptions, container: HTMLElement) {
  const el = document.createElement('web-ui-toast') as WebUiToast
  el.toastId = id
  el.type = options.type || 'info'
  el.position = options.position || 'top-right'
  el.heading = options.heading || ''
  el.message = options.message
  el.duration = options.duration ?? 3000
  el.closable = options.closable ?? true

  el.addEventListener('toast-close', (e: Event) => {
    const detail = (e as CustomEvent).detail
    _removeToast(detail.id, detail.reason)
  })

  container.appendChild(el)
  visibleToasts.set(id, el)
  // 等 DOM 挂载后触发动画
  requestAnimationFrame(() => el.show())
}

function _removeToast(id: string, _reason: ToastCloseReason) {
  const el = visibleToasts.get(id)
  if (!el) return
  el.remove()
  visibleToasts.delete(id)
}

function close(id: string) {
  const el = visibleToasts.get(id)
  if (el) el.dismiss('programmatic')
}

function clear() {
  for (const [, el] of visibleToasts) {
    el.dismiss('clear')
  }
}

function toast(options: ToastInstanceOptions): string {
  return createToast(options)
}

type ToastShortcutOptions = Omit<ToastOptions, 'message' | 'type'> & Pick<ToastInstanceOptions, 'position'>

toast.success = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'success' })

toast.info = (message: string, options?: ToastShortcutOptions) => createToast({ ...options, message, type: 'info' })

toast.warning = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'warning' })

toast.error = (message: string, options?: ToastShortcutOptions) =>
  createToast({ ...options, message, type: 'error', duration: options?.duration ?? 5000 })

toast.close = close
toast.clear = clear

/** 获取当前可见 toast 数量（测试用） */
toast._visibleCount = () => visibleToasts.size

/** 重置全部状态（测试用） */
toast._reset = () => {
  _pendingBatch = null
  _batchScheduled = false
  for (const [, el] of visibleToasts) {
    el.remove()
  }
  visibleToasts.clear()
  for (const container of toastContainers) {
    container.remove()
  }
  toastContainers.clear()
}

export { toast }
