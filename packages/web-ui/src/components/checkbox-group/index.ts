import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import type { WebUiCheckbox } from '../checkbox'

import style from './style.css?inline'

@customElement('web-ui-checkbox-group')
export class WebUiCheckboxGroup extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Array }) value: string[] = []
  @property({ type: Boolean, reflect: true }) disabled = false

  private readonly childObserver = new MutationObserver(() => this._syncValueToChildren())

  private _syncValueToChildren() {
    this.querySelectorAll<WebUiCheckbox>('web-ui-checkbox').forEach(checkbox => {
      checkbox.checked = this.value.includes(checkbox.value)
      checkbox.disabled = this.disabled
    })
  }

  override updated(props: PropertyValues) {
    if (props.has('value') || props.has('disabled')) this._syncValueToChildren()
  }

  override connectedCallback() {
    super.connectedCallback()
    this.childObserver.observe(this, { childList: true })
    this.addEventListener('update:checked', this._handleCheckboxChange as EventListener)
  }

  override firstUpdated() {
    this._syncValueToChildren()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.childObserver.disconnect()
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
