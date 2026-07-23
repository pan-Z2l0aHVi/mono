import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-checkbox-group')
export class WebUiCheckboxGroup extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Array }) value: string[] = []
  @property({ type: Boolean, reflect: true }) disabled = false

  private _syncValueToChildren() {
    this.querySelectorAll('web-ui-checkbox').forEach(r => {
      const v = r.getAttribute('value')
      if (v !== null && this.value.includes(v)) {
        r.setAttribute('checked', '')
      } else {
        r.removeAttribute('checked')
      }
      r.toggleAttribute('disabled', this.disabled)
    })
  }

  override updated(props: PropertyValues) {
    if (props.has('disabled')) {
      this.querySelectorAll('web-ui-checkbox').forEach(r => r.toggleAttribute('disabled', this.disabled))
    }
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('update:checked', this._handleCheckboxChange as EventListener)
  }

  override firstUpdated() {
    this._syncValueToChildren()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('update:checked', this._handleCheckboxChange as EventListener)
  }

  private _handleCheckboxChange(e: CustomEvent<{ checked: boolean; value: string }>) {
    if (this.disabled) return
    const { checked, value } = e.detail

    const next = checked ? [...new Set([...this.value, value])] : this.value.filter(v => v !== value)

    this.value = next
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: next },
        bubbles: true,
        composed: true
      })
    )
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    return html`<div class="wui-checkbox-group"><slot></slot></div>`
  }
}

export interface WebUiCheckboxGroup {
  readonly $events: {
    'value-changed': CustomEvent<{ value: string[] }>
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-checkbox-group': WebUiCheckboxGroup
  }
}
