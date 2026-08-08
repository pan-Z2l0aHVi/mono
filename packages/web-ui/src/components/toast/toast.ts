import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'

import '@/components/icon'
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
          <web-ui-icon .icon=${icon} :size="18"></web-ui-icon>
        </span>
        <div class="toast-body">
          ${this.heading ? html`<div class="toast-heading">${this.heading}</div>` : nothing}
          <div class="toast-message">${this.message}</div>
        </div>
        <span class="toast-time">${_formatTime()}</span>
        ${!this.noCloseButton
          ? html`
              <button class="toast-close-btn wui-glass" aria-label="关闭" @click=${this._onCloseClick}>
                <web-ui-icon .icon=${heroiconsXMark16Solid} :size="10"></web-ui-icon>
              </button>
            `
          : nothing}
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
