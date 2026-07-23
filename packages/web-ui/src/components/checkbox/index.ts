import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import { heroiconsCheck16Solid } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-checkbox')
export class WebUiCheckbox extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String }) value = ''
  @property({ type: String }) name = ''
  @property({ type: Boolean, reflect: true }) checked = false
  @property({ type: Boolean, reflect: true }) disabled = false

  private handleClick() {
    if (this.disabled) return
    this.checked = !this.checked
    this.dispatchEvent(
      new CustomEvent('update:checked', {
        detail: { checked: this.checked, value: this.value },
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
      'wui-checkbox': true,
      'is-checked': this.checked,
      'is-disabled': this.disabled
    }

    return html`
      <label class=${classMap(cls)} tabindex="0" @click=${this.handleClick} @keydown=${this.handleKeyDown}>
        <span class="wui-checkbox-box">
          <span class="wui-checkbox-icon"
            ><web-ui-icon .icon=${heroiconsCheck16Solid} size="18" color="#fff"></web-ui-icon
          ></span>
        </span>
        <span class="wui-checkbox-label"><slot></slot></span>
      </label>
    `
  }
}

export interface WebUiCheckbox {
  readonly $events: {
    'update:checked': CustomEvent<{ checked: boolean; value: string }>
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-checkbox': WebUiCheckbox
  }
}
