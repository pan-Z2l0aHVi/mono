import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import { heroiconsCheck16Solid } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-option')
export class WebUiOption extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String, reflect: true }) value = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) selected = false

  override connectedCallback() {
    super.connectedCallback()
    this.dispatchEvent(
      new CustomEvent('option-register', {
        bubbles: true,
        composed: true,
        detail: { value: this.value, label: this.textContent?.trim() || '', disabled: this.disabled }
      })
    )
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.dispatchEvent(
      new CustomEvent('option-unregister', {
        bubbles: true,
        composed: true,
        detail: { value: this.value }
      })
    )
  }

  override render() {
    return html`
      <div class="option-label">
        <web-ui-icon class="check" .size=${16} .icon=${heroiconsCheck16Solid}></web-ui-icon>
        <slot></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-option': WebUiOption
  }
}
