import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import style from './style.css?inline'

@customElement('web-ui-radio')
export class WebUiRadio extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String }) value = ''
  @property({ type: String }) name = ''
  @property({ type: Boolean, reflect: true }) checked = false
  @property({ type: Boolean, reflect: true }) disabled = false

  private handleClick() {
    if (this.disabled || this.checked) return
    this.checked = true
    this.dispatchEvent(
      new CustomEvent('update:checked', {
        detail: { checked: true, value: this.value },
        bubbles: true,
        composed: true
      })
    )
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.handleClick()
    }
  }

  override render() {
    const cls = {
      'wui-radio': true,
      'is-checked': this.checked,
      'is-disabled': this.disabled
    }

    return html`
      <label class=${classMap(cls)} tabindex="0" @click=${this.handleClick} @keydown=${this.handleKeyDown}>
        <span class="wui-radio-circle">
          <span class="wui-radio-dot"></span>
        </span>
        <span class="wui-radio-label"><slot></slot></span>
      </label>
    `
  }
}

export interface WebUiRadio {
  readonly $events: {
    'update:checked': CustomEvent<{ checked: boolean; value: string }>
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-radio': WebUiRadio
  }
}
