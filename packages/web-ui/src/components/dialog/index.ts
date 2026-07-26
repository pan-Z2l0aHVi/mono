import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-dialog')
export class WebUiDialog extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true

  private _hasScrollLock = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (props.has('open')) {
      this.emitOpenChange()
      if (this.open) {
        this.dialog?.showModal?.()
      } else {
        this.dialog?.close?.()
      }
    }
    if (props.has('open') || props.has('lockScroll')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
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
    e.preventDefault()
    this.close()
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
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

  private _syncScrollLock(isOpen = this.open) {
    const shouldLock = isOpen && this.lockScroll
    if (shouldLock === this._hasScrollLock) return

    if (shouldLock) lockScroll()
    else unlockScroll()
    this._hasScrollLock = shouldLock
  }

  override render() {
    return html`
      <dialog @cancel=${this.handleCancel} @click=${this.handleBackdropClick}>
        <div class="wui-dialog-body wui-glass">
          <div class="title"><slot name="title"></slot></div>
          <div class="desc"><slot></slot></div>
          <div class="wui-dialog-footer"><slot name="footer"></slot></div>
        </div>
      </dialog>
    `
  }
}

export interface WebUiDialog {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
  open: boolean
  lockScroll: boolean
  showModal(): void
  close(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dialog': WebUiDialog
  }
}
