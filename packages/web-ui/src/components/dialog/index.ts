import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { overlayComposition } from '@/shared/overlay/composition'
import { defineOverlayEscapeDismiss } from '@/shared/overlay/escape-dismiss'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-dialog')
export class WebUiDialog extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'no-backdrop-close' }) noBackdropClose = false
  @property({ type: Boolean, reflect: true, attribute: 'no-escape-close' }) noEscapeClose = false

  /**
   * Controlled 模式下，Escape 和遮罩点击只派发 `open-change` 请求，
   * 不会自行修改 `open`。Consumer 回写 `open` 后才执行关闭动画。
   * 程序化 API（showModal/close/直接赋值 open）不受此模式影响，始终直通。
   */
  @property({ type: Boolean, reflect: true }) controlled = false

  @state() private _hasBody = false
  private readonly _userOpenChange = new UserChangeController()

  /*
   * Escape 由共享仲裁者统一归属（issue #120 Block 1）。dialog 的 Escape 原本只走原生
   * cancel 事件：仲裁者会在 keydown 上 preventDefault 压掉原生关闭请求并 stopPropagation，
   * 因此这里必须自己表达关闭语义（controlled 只派发请求）。
   */
  private readonly _escape = defineOverlayEscapeDismiss().make({
    isConnected: () => this.isConnected,
    isOpen: () => this.open,
    isEscapeCloseEnabled: () => !this.noEscapeClose,
    requestClose: () => {
      if (this.controlled) {
        this.emitOpenChange(false)
        return
      }
      this._userOpenChange.mark()
      this.close()
    }
  })
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this.open
  })

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      if (this._userOpenChange.consume()) this.emitOpenChange()
      this._presence.sync(this.open)
      // 原生 dialog 登记为 overlay panel：挂在它上面的 portal 面板成为本层后代，
      // Escape 仲裁据此判出最内层（issue #120 Block 1）。
      const dialog = this.dialog
      if (dialog) {
        if (this.open) {
          overlayComposition.registerPanelFromAncestry(dialog, this)
          this._escape.setPanel(dialog)
        } else {
          overlayComposition.unregisterPanel(dialog)
          this._escape.setPanel(null)
        }
      }
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._presence.dispose()
    this._scrollLock.release()
    this._escape.dispose()
  }

  // 以模态方式打开对话框（命令式）
  showModal() {
    if (this.open) return
    this.open = true
  }

  close() {
    this.open = false
  }

  private handleCancel(e: Event) {
    // 子控件（例如 file input）可能派发冒泡的 cancel；只让 native dialog 自身的 cancel 关闭。
    if (e.target !== e.currentTarget) return

    // 保留 top layer 直到视觉退场完成，避免原生关闭跳过退出动画。
    e.preventDefault()
    if (this.noEscapeClose) return
    if (this.controlled) {
      this.emitOpenChange(false)
      return
    }
    this._userOpenChange.mark()
    this.close()
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (this.noBackdropClose) return
    if (this.controlled) {
      this.emitOpenChange(false)
      return
    }
    this._userOpenChange.mark()
    this.close()
  }

  // controlled 下派发关闭请求：detail 固定 false（用户只能请求关闭，打开永远由 Consumer 写）。
  private emitOpenChange(open = this.open) {
    dispatchOpenChangeEvent(this, open)
  }

  private _onTransitionEnd = (event: TransitionEvent) => {
    this._presence.handleTransitionEnd(event)
  }

  private _onNativeClose = () => {
    // 关闭态下的 close 事件只可能是我们自己 finishClosing 排队的异步事件（或冗余的
    // 外部关闭）：交给 presence 消费 self-close 标志，避免标志泄漏到下一次真实关闭。
    if (!this.open) {
      this._presence.handleNativeClose()
      return
    }

    // 我们自己 dialog.close() 排队的 close 事件是异步任务：正常时序在本关闭会话内
    // 到达，快速「关闭→重开」时它在重新打开之后才到达（过期事件）。两种情况都已
    // 完成清理，由 presence 消费并返回 true，不能当成外部关闭把刚重开的 dialog 关掉。
    if (this._presence.handleNativeClose()) return

    // controlled 下原生关闭（如表单 method="dialog"）视为未经 Consumer 批准的状态丢失：
    // 恢复受控状态并派发关闭请求，由 Consumer 决定是否关闭。
    if (this.controlled) {
      this._presence.sync(true)
      this.emitOpenChange(false)
      return
    }

    this._userOpenChange.mark()
    this.open = false
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _onBodySlotChange(e: Event) {
    if (!(e.target instanceof HTMLSlotElement)) return
    this._hasBody = e.target.assignedElements().length > 0
  }

  override render() {
    return html`
      <dialog
        @cancel=${this.handleCancel}
        @close=${this._onNativeClose}
        @click=${this.handleBackdropClick}
        @transitionend=${this._onTransitionEnd}
      >
        <div class="wui-dialog-body wui-glass">
          ${
            this._hasBody
              ? html`<slot name="body" @slotchange=${this._onBodySlotChange}></slot>`
              : html`
                  <slot name="body" @slotchange=${this._onBodySlotChange} hidden></slot>
                  <div class="title"><slot name="title"></slot></div>
                  <div class="desc"><slot></slot></div>
                  <div class="wui-dialog-footer"><slot name="footer"></slot></div>
                `
          }
        </div>
      </dialog>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dialog': WebUiDialog
  }
}
