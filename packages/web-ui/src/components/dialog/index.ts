import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/button'
import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-dialog')
export class WebUiDialog extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @state() private entering = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
  }

  protected override willUpdate(props: PropertyValues) {
    if (props.has('open') && this.open && !this.entering) {
      this.entering = true
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (props.has('open')) {
      this.emitOpenChange()
      if (this.open) {
        this.dialog?.showModal?.()
        requestAnimationFrame(() => {
          this.entering = false
        })
      } else {
        this.dialog?.close?.()
      }
    }
  }

  /** 以模态方式打开对话框（命令式） */
  showModal() {
    if (this.open) return
    this.entering = true
    this.open = true
  }

  /** 关闭对话框 */
  close() {
    this.open = false
  }

  private onDialogCancel(e: Event) {
    e.preventDefault()
    this.close()
  }

  private onBackdropClick(e: MouseEvent) {
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

  override render() {
    return html`
      <dialog
        class=${classMap({ entering: this.entering })}
        @cancel=${this.onDialogCancel}
        @click=${this.onBackdropClick}
      >
        <div class="wui-dialog-body wui-glass wui-glass-no-after">
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
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dialog': WebUiDialog
  }
}
