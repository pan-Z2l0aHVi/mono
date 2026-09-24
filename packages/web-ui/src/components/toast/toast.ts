import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'

import '@/components/icon'
// web-ui-button 复用 icon 变体的焦点环与统一样式（secondary 变体，浅灰底贴合 toast 角落）
import '@/components/button'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import {
  lucideInfo,
  lucideTriangleAlert,
  lucideCircleAlert,
  heroiconsXMark16Solid,
  heroiconsCheck16Solid
} from '@/icons'
import { getTransitionDuration } from '@/shared/overlay/presence'

import style from './style.css?inline'
import type { ToastCloseReason, ToastPosition, ToastType } from './types'

const TYPE_ICONS: Record<ToastType, IconifyIcon> = {
  success: heroiconsCheck16Solid,
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
  /** 指针停在 toast 上：计时处于悬停暂停态，只有指针离开才能续跑。 */
  private _hoverPaused = false
  private _dismissing = false

  /**
   * 退场已开始、`toast-close` 尚未派发。这段窗口内元素仍连接在 DOM、也仍被 manager 的映射
   * 持有，但已不再接受属性更新：manager 的 upsert 据此走新建路径，否则「更新」会写进一条
   * 正在消失的元素里 —— 调用方拿到同一个 id，却看不到任何可见通知。
   */
  get dismissing(): boolean {
    return this._dismissing
  }

  /** 指针仍停在 toast 上，自动关闭计时处于暂停态。 */
  get hoverPaused(): boolean {
    return this._hoverPaused
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('pointerenter', this._onPointerEnter)
    this.addEventListener('pointerleave', this._onPointerLeave)
    // 悬停中被搬迁（不支持 moveBefore 的引擎走摘出重插）时暂停态要连兜底一起带回来，
    // 否则新位置上既没有 document 监听、也不会再补发 pointerenter，这条 toast 又变成永久停留。
    if (this._hoverPaused) this._attachHoverFallback()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    this._detachHoverFallback()
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

  startAutoClose() {
    this._clearTimer()
    if (this.duration > 0) {
      this._deadline = Date.now() + this.duration
      this._closeTimer = setTimeout(() => {
        this.dismiss('auto')
      }, this.duration)
    }
  }

  /**
   * 由 manager 调用：显式 `duration` 更新。悬停暂停期间只记新值、不点火 —— 否则指针还压在
   * toast 上时计时就被重启，「悬停暂停」在这条路径上直接失效。恢复时按新 duration 计满：
   * 调用方显式改了生命周期，续跑按旧时长算出的剩余没有意义。`0` 表示不自动关闭，记成
   * 「没有计时器」，否则恢复时会被当成「已到期」立即退场。
   */
  setDuration(ms: number) {
    this.duration = ms
    if (this._hoverPaused) {
      this._pausedRemaining = ms > 0 ? ms : undefined
      return
    }
    this.startAutoClose()
  }

  // 不支持 moveBefore 的引擎上搬迁节点前调用：记下剩余时间，搬完由 resumeAutoClose() 续跑。
  pauseAutoClose() {
    // 已经在暂停态时保留既有剩余：悬停暂停期间若发生搬迁，降级路径也会走到这里，无条件
    // 重算会把悬停记下的剩余抹成「没有计时器」，指针离开后这条 toast 就再也不会关闭。
    if (this._closeTimer === undefined && this._pausedRemaining !== undefined) return
    // 计时器仍在跑时剩余时间可能算出 0：deadline 已过、回调还排在队列里没执行。这一支与
    // 「本来就没有计时器」必须分开记（undefined vs 0），否则续跑无法区分两者。
    this._pausedRemaining = this._closeTimer === undefined ? undefined : Math.max(0, this._deadline - Date.now())
    this._clearTimer()
  }

  // 与 pauseAutoClose() 成对：暂停时没有计时器就保持原状，不重启满时长；
  // 已到期则立即退场 —— 而不是把「已到期」当成「从来没有计时器」放过，那样这条 toast 会永不关闭。
  resumeAutoClose() {
    // 悬停还没结束时只交还剩余时间、不点火：搬迁降级路径也会走到这里，真正的续跑等指针
    // 离开（_resumeFromHover）再开始，否则鼠标还停着就已经在倒计时了。
    if (this._hoverPaused) return
    const remaining = this._pausedRemaining
    this._pausedRemaining = undefined
    if (remaining === undefined) return
    // 装新计时器前先拆掉可能仍在跑的旧计时器：pause/resume 一旦不再严格成对（调用序被重排），
    // 直接覆盖 `_closeTimer` 会留下两个 deadline 同时倒计时，先到的那个把 toast 提前关掉。
    this._clearTimer()
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
    // 挂载时指针已经压在上面（光标停在 toast 将要出现的位置）：入场后直接进入暂停，
    // 不能点火 —— 那条计时会在指针还停着的时候把 toast 关掉。
    if (this._hoverPaused) {
      this._pausedRemaining = this.duration > 0 ? this.duration : undefined
      return
    }
    this.startAutoClose()
  }

  // 含退场动画，结束由 transitionend 驱动后派发 close。
  dismiss(reason: ToastCloseReason = 'programmatic') {
    if (this._dismissing) return
    this._dismissing = true
    // 退场优先于悬停：暂停态不再有意义，document 兜底监听也要收掉，否则退场中的
    // 元素会继续持有「指针还在上面」的状态。
    this._hoverPaused = false
    this._detachHoverFallback()
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
    if (this._hoverPaused) return
    this._hoverPaused = true
    this.pauseAutoClose()
    // pointerleave 是唯一的恢复入口时，漏掉一次（指针拖出窗口、元素在悬停期间被搬迁或
    // 摘出、光标静止时布局把 toast 移走）这条 toast 就永久停在屏幕上。document 级兜底
    // 补上这个缺口：指针落到别的元素上、或离开文档，都判定悬停结束。三个信号互相兜底，
    // 因为单一信号在不同引擎上都有漏派发的场景。
    this._attachHoverFallback()
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    this._resumeFromHover()
  }

  // 兜底路径：指针移到别的元素上（冒泡到 document）。路径不含本元素说明指针已经不在
  // toast 上；composedPath() 覆盖 shadow DOM，指针在 toast 内部节点之间移动不算离开。
  private _onDocumentPointerOver = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (e.composedPath().includes(this)) return
    this._resumeFromHover()
  }

  // 兜底路径：指针移出窗口。部分引擎不保证 document 上的 pointerleave，用 relatedTarget
  // 为空的 pointerout 补上 —— 悬停中的 toast 被摘除时同样会派发这种 pointerout。
  private _onDocumentPointerOut = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (e.relatedTarget !== null) return
    this._resumeFromHover()
  }

  // 兜底路径：指针离开整个文档（移出窗口）。文档内的元素间移动不会派发到 document。
  private _onDocumentPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    this._resumeFromHover()
  }

  private _resumeFromHover() {
    if (!this._hoverPaused) return
    this._hoverPaused = false
    this._detachHoverFallback()
    this.resumeAutoClose()
  }

  private _attachHoverFallback() {
    document.addEventListener('pointerover', this._onDocumentPointerOver)
    document.addEventListener('pointerout', this._onDocumentPointerOut)
    document.addEventListener('pointerleave', this._onDocumentPointerLeave)
  }

  private _detachHoverFallback() {
    document.removeEventListener('pointerover', this._onDocumentPointerOver)
    document.removeEventListener('pointerout', this._onDocumentPointerOut)
    document.removeEventListener('pointerleave', this._onDocumentPointerLeave)
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
