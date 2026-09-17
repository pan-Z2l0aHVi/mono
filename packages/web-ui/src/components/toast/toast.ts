import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'

import '@/components/icon'
// web-ui-button 复用 icon 变体的焦点环与统一样式（secondary 变体，浅灰底贴合 toast 角落）
import '@/components/button'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { lucideCheck, lucideInfo, lucideTriangleAlert, lucideCircleAlert, heroiconsXMark16Solid } from '@/icons'
import { getTransitionDuration } from '@/shared/overlay/presence'

import style from './style.css?inline'
import type { ToastCloseReason, ToastPosition, ToastType } from './types'

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

  @property({ type: String, attribute: false }) toastId = ''
  @property({ type: String, reflect: true }) type: ToastType = 'info'
  @property({ type: String, reflect: true }) position: ToastPosition = 'top-right'
  @property({ type: String }) heading = ''
  @property({ type: String }) message = ''
  @property({ type: Number }) duration = 3000
  @property({ type: Boolean, reflect: true, attribute: 'no-close-button' }) noCloseButton = false
  @property({ type: Boolean, reflect: true }) visible = false

  private _closeTimer?: ReturnType<typeof setTimeout>
  private _deadline = 0
  /**
   * 暂停自动关闭时记下的剩余时间。`undefined` 表示暂停时本来就没有计时器（`duration` 为 0、
   * 或元素尚未 `show()`），与「已到期」（剩余 0）是两件事，不能共用一个 0。
   */
  private _pausedRemaining?: number
  private _dismissing = false

  /**
   * 退场已开始、`toast-close` 尚未派发。这段窗口内元素仍连接在 DOM、也仍被 manager 的映射
   * 持有，但已不再接受属性更新：manager 的 upsert 据此走新建路径，否则「更新」会写进一条
   * 正在消失的元素里 —— 调用方拿到同一个 id，却看不到任何可见通知。
   */
  get dismissing(): boolean {
    return this._dismissing
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('pointerenter', this._onPointerEnter)
    this.addEventListener('pointerleave', this._onPointerLeave)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    this._clearTimer()
  }

  /**
   * 定义该回调后，`Element.moveBefore()` 搬迁节点不再触发 disconnected/connected，
   * 自动关闭计时与动画状态得以保留；未定义时旧引擎会走摘出重插，计时被 `_clearTimer()` 清掉。
   */
  connectedMoveCallback() {}

  protected override updated(changed: PropertyValues) {
    if (changed.has('position')) {
      this._applySlideDirection()
    }
  }

  // 根据 position 设置入场/退场滑动方向
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

  // 启动自动关闭计时器
  startAutoClose() {
    this._clearTimer()
    if (this.duration > 0) {
      this._deadline = Date.now() + this.duration
      this._closeTimer = setTimeout(() => {
        this.dismiss('auto')
      }, this.duration)
    }
  }

  // 不支持 moveBefore 的引擎上搬迁节点前调用：记下剩余时间，搬完由 resumeAutoClose() 续跑。
  pauseAutoClose() {
    // 计时器仍在跑时剩余时间可能算出 0：deadline 已过、回调还排在队列里没执行。这一支与
    // 「本来就没有计时器」必须分开记（undefined vs 0），否则续跑无法区分两者。
    this._pausedRemaining = this._closeTimer === undefined ? undefined : Math.max(0, this._deadline - Date.now())
    this._clearTimer()
  }

  // 与 pauseAutoClose() 成对：暂停时没有计时器就保持原状，不重启满时长；
  // 已到期则立即退场 —— 而不是把「已到期」当成「从来没有计时器」放过，那样这条 toast 会永不关闭。
  resumeAutoClose() {
    const remaining = this._pausedRemaining
    this._pausedRemaining = undefined
    if (remaining === undefined) return
    if (remaining <= 0) {
      this.dismiss('auto')
      return
    }
    this._deadline = Date.now() + remaining
    this._closeTimer = setTimeout(() => {
      this.dismiss('auto')
    }, remaining)
  }

  // 由 manager 调用：播放入场动画后自动开始计时
  show() {
    this._dismissing = false
    this.visible = true
    this.startAutoClose()
  }

  // 含退场动画，结束由 transitionend 驱动后派发 close。
  dismiss(reason: ToastCloseReason = 'programmatic') {
    if (this._dismissing) return
    this._dismissing = true
    if (!this.visible) {
      // 尚未 show()（manager 挂载之后、rAF 之前）或从未显示过：没有退场动画可播，立即派发，
      // 由 manager 的 toast-close 监听摘除元素。若在这里早退，close()/clear() 落在这段窗口
      // 里就会静默失效 —— 元素照常入场，调用方却以为已经关掉了。
      this._dispatchClose(reason)
      return
    }
    this.visible = false
    this._clearTimer()
    const onEnd = () => {
      this.removeEventListener('transitionend', onEnd)
      this._dispatchClose(reason)
    }
    this.addEventListener('transitionend', onEnd)
    // fallback: transitionend 不触发时（display:none 等）
    const toast = this.shadowRoot?.querySelector<HTMLElement>('.toast')
    setTimeout(onEnd, getTransitionDuration(toast ?? this) + 80)
  }

  private _clearTimer() {
    if (this._closeTimer !== undefined) {
      clearTimeout(this._closeTimer)
      this._closeTimer = undefined
    }
  }

  private _onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    this._clearTimer()
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
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
    // role="alert" 会强制隐式 aria-live="assertive"，覆盖掉上方 aria-live 设置，
    // 因此仅 error toast 使用 alert（本就应 assertive）；其余类型交给容器 role="log" 的 polite 播报。
    const role = this.type === 'error' ? 'alert' : nothing

    return html`
      <div class="toast wui-glass ${this.type}" role=${role} aria-live=${ariaLive} aria-atomic="true">
        <span class="toast-icon" aria-hidden="true">
          <web-ui-icon .icon=${icon} size="14"></web-ui-icon>
        </span>
        <div class="toast-body">
          ${this.heading ? html`<div class="toast-heading">${this.heading}</div>` : nothing}
          <div class="toast-message">${this.message}</div>
        </div>
        <span class="toast-time">${_formatTime()}</span>
        ${
          !this.noCloseButton
            ? html`
                <web-ui-button
                  class="toast-close-btn"
                  icon
                  variant="secondary"
                  size="24"
                  aria-label="关闭"
                  @click=${this._onCloseClick}
                >
                  <web-ui-icon .icon=${heroiconsXMark16Solid} size="16"></web-ui-icon>
                </web-ui-button>
              `
            : nothing
        }
      </div>
    `
  }

  declare readonly $events: {
    'toast-close': CustomEvent<{ id: string; reason: ToastCloseReason }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-toast': WebUiToast
  }
}
