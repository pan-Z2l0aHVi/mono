import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { getTransitionDuration } from '@/shared/overlay/presence'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-dialog')
export class WebUiDialog extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true
  @property({ reflect: true, attribute: 'overlay-closable', converter: booleanWithFalseString }) overlayClosable = true

  @state() private _hasBody = false

  private _hasScrollLock = false
  private _closeFallbackTimer?: ReturnType<typeof setTimeout>
  private _openFrame?: number
  private _isClosing = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      this.emitOpenChange()
      if (this.open) this._startOpening()
      else this._startClosing()
    }
    if (props.has('open') || props.has('lockScroll')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._cancelOpenFrame()
    this._clearCloseFallback()
    this._syncScrollLock(false)
  }

  /** 以模态方式打开对话框（命令式） */
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
    this.close()
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (!this.overlayClosable) return
    this.close()
  }

  private emitOpenChange() {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: this.open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _startOpening() {
    const dialog = this.dialog
    if (!dialog) return

    this._isClosing = false
    this._clearCloseFallback()
    dialog.classList.remove('is-closing')
    if (!dialog.open) dialog.showModal?.()

    this._cancelOpenFrame()
    this._openFrame = requestAnimationFrame(() => {
      this._openFrame = undefined
      if (!this.isConnected || !this.open || !dialog.open) return
      dialog.classList.add('is-visible')
    })
  }

  private _startClosing() {
    const dialog = this.dialog
    if (!dialog?.open) return

    this._cancelOpenFrame()
    this._isClosing = true
    if (!dialog.classList.contains('is-visible')) {
      this._finishClosing()
      return
    }

    dialog.classList.add('is-closing')
    dialog.classList.remove('is-visible')
    this._clearCloseFallback()
    this._closeFallbackTimer = setTimeout(() => this._finishClosing(), getTransitionDuration(dialog) + 80)
  }

  private _finishClosing() {
    const dialog = this.dialog
    if (!dialog || !this._isClosing || this.open) return

    this._clearCloseFallback()
    this._isClosing = false
    dialog.classList.remove('is-closing', 'is-visible')
    if (dialog.open) dialog.close?.()
  }

  private _clearCloseFallback() {
    if (this._closeFallbackTimer === undefined) return
    clearTimeout(this._closeFallbackTimer)
    this._closeFallbackTimer = undefined
  }

  private _cancelOpenFrame() {
    if (this._openFrame === undefined) return
    cancelAnimationFrame(this._openFrame)
    this._openFrame = undefined
  }

  private _onTransitionEnd = (event: TransitionEvent) => {
    if (event.target !== this.dialog || event.propertyName !== 'transform') return
    this._finishClosing()
  }

  private _onNativeClose = () => {
    if (!this.open) return
    this._cancelOpenFrame()
    this._clearCloseFallback()
    this._isClosing = false
    this.dialog?.classList.remove('is-closing', 'is-visible')
    this.open = false
  }

  private _syncScrollLock(isOpen = this.open) {
    const shouldLock = isOpen && this.lockScroll
    if (shouldLock === this._hasScrollLock) return

    if (shouldLock) lockScroll()
    else unlockScroll()
    this._hasScrollLock = shouldLock
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
          ${this._hasBody
            ? html`<slot name="body" @slotchange=${this._onBodySlotChange}></slot>`
            : html`
                <slot name="body" @slotchange=${this._onBodySlotChange} hidden></slot>
                <div class="title"><slot name="title"></slot></div>
                <div class="desc"><slot></slot></div>
                <div class="wui-dialog-footer"><slot name="footer"></slot></div>
              `}
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
