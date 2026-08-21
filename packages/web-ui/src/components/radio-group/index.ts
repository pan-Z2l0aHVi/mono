import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { defineGroupCoordinator, GroupController } from '@/shared/group-management'

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

  private readonly _groupController = new GroupController(
    this,
    defineGroupCoordinator<WebUiRadio, string>({
      host: this,
      getItems: () => [...this.querySelectorAll<WebUiRadio>('web-ui-radio')],
      getValue: () => this._value,
      setValue: value => {
        this.value = value
      },
      getDisabled: () => this._isDisabled,
      isItem: (target): target is WebUiRadio => target instanceof HTMLElement && target.matches('web-ui-radio'),
      isItemSelected: (radio, value) => radio.value === value,
      getNextValue: (radio, value) => (radio.checked ? radio.value : value),
      valuesEqual: (a, b) => a === b,
      copyValue: value => value,
      setItemSelected: (radio, selected) => {
        radio.checked = selected
      },
      dispatchValueChange: () => {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }).make()
  )

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
  }

  override updated() {
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

  override render() {
    return html`<div class="wui-radio-group"><slot></slot></div>`
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-radio-group': WebUiRadioGroup
  }
}
