import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
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
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._presence.dispose()
    this._scrollLock.release()
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
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _onTransitionEnd = (event: TransitionEvent) => {
    this._presence.handleTransitionEnd(event)
  }

  private _onNativeClose = () => {
    if (!this.open) return

    // controlled 下原生关闭（如表单 method="dialog"）视为未经 Consumer 批准的状态丢失：
    // 恢复受控状态并派发关闭请求，由 Consumer 决定是否关闭。
    if (this.controlled) {
      this._presence.sync(true)
      this.emitOpenChange(false)
      return
    }

    this._presence.handleNativeClose()
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
