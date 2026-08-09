import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import type { WebUiRadio } from '../radio'

import style from './style.css?inline'

@customElement('web-ui-radio-group')
export class WebUiRadioGroup extends LitElement {
  static override styles = unsafeCSS(style)
  static formAssociated = true

  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  private _internals?: ElementInternals
  @state() private _value = ''
  @state() private _formDisabled = false
  private _initialValue = ''

  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._syncFormValue()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  override connectedCallback() {
    super.connectedCallback()
    if (!this._internals) this._internals = this.attachInternals()
    const attributeValue = this.getAttribute('value')
    if (attributeValue !== null) this.value = attributeValue
    this._initialValue = this._value
    this.addEventListener('change', this._handleChildChange)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('change', this._handleChildChange)
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('disabled') || changed.has('_formDisabled')) this._syncValueToChildren()
    this._syncFormValue()
    this._syncValidity()
  }

  formResetCallback() {
    this.value = this._initialValue
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  private _syncFormValue() {
    this._internals?.setFormValue?.(this.name && this._value ? this._value : null)
  }

  private _syncValidity() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._value) this._internals.setValidity({})
    else this._internals.setValidity({ valueMissing: true }, '请选择一项')
  }

  private _syncValueToChildren() {
    this.querySelectorAll<WebUiRadio>('web-ui-radio').forEach(radio => {
      radio.checked = radio.value === this._value
      radio.setGroupDisabled(this._isDisabled)
    })
  }

  private _handleChildChange(e: Event) {
    if (this._isDisabled) return
    const target = e.target as HTMLElement
    if (!target.matches?.('web-ui-radio')) return

    const radio = target as WebUiRadio
    if (!radio.checked || radio.value === this._value) return

    this.value = radio.value
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _handleSlotChange() {
    this._syncValueToChildren()
  }

  override render() {
    return html`<div class="wui-radio-group"><slot @slotchange=${this._handleSlotChange}></slot></div>`
  }

  declare readonly $events: {
    input: Event & { target: WebUiRadioGroup }
    change: Event & { target: WebUiRadioGroup }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-radio-group': WebUiRadioGroup
  }
}
