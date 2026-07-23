import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import type { WebUiRadio } from '../radio'

import style from './style.css?inline'

@customElement('web-ui-radio-group')
export class WebUiRadioGroup extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String }) value = ''
  @property({ type: String }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false

  private readonly childObserver = new MutationObserver(() => this._syncValueToChildren())

  private _syncValueToChildren() {
    this.querySelectorAll<WebUiRadio>('web-ui-radio').forEach(radio => {
      radio.checked = radio.value === this.value
      radio.disabled = this.disabled
    })
  }

  override updated(props: PropertyValues) {
    if (props.has('value') || props.has('disabled')) this._syncValueToChildren()
  }

  override connectedCallback() {
    super.connectedCallback()
    this.childObserver.observe(this, { childList: true })
    this.addEventListener('update:checked', this._handleRadioChange as EventListener)
  }

  override firstUpdated() {
    this._syncValueToChildren()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.childObserver.disconnect()
    this.removeEventListener('update:checked', this._handleRadioChange as EventListener)
  }

  private _handleRadioChange(e: CustomEvent<{ checked: boolean; value: string }>) {
    if (this.disabled) return
    const newValue = e.detail.value
    if (newValue === this.value) return

    this._uncheckAll()

    const target = e.target as HTMLElement
    if (target.matches('web-ui-radio')) {
      target.setAttribute('checked', '')
    }

    this.value = newValue
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: newValue },
        bubbles: true,
        composed: true
      })
    )
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _uncheckAll() {
    this.querySelectorAll('web-ui-radio').forEach(r => r.removeAttribute('checked'))
  }

  override render() {
    return html`<div class="wui-radio-group"><slot></slot></div>`
  }
}

export interface WebUiRadioGroup {
  readonly $events: {
    'value-changed': CustomEvent<{ value: string }>
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-radio-group': WebUiRadioGroup
  }
}
