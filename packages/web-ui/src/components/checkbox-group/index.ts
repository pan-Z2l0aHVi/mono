import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { defineGroupCoordinator, GroupController } from '@/shared/group-management'

import type { WebUiCheckbox } from '../checkbox'

import style from './style.css?inline'

@customElement('web-ui-checkbox-group')
export class WebUiCheckboxGroup extends LitElement {
  static override styles = unsafeCSS(style)
  static formAssociated = true

  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  @state() private _value: string[] = []
  @state() private _formDisabled = false
  private _internals?: ElementInternals
  private _initialValue: string[] = []

  private readonly _groupController = new GroupController(
    this,
    defineGroupCoordinator<WebUiCheckbox, string[]>({
      host: this,
      getItems: () => [...this.querySelectorAll<WebUiCheckbox>('web-ui-checkbox')],
      getValue: () => this._value,
      setValue: value => {
        this.value = value
      },
      getDisabled: () => this._isDisabled,
      isItem: (target): target is WebUiCheckbox => target instanceof HTMLElement && target.matches('web-ui-checkbox'),
      isItemSelected: (checkbox, value) => value.includes(checkbox.value),
      getNextValue: (checkbox, value) =>
        checkbox.checked ? [...new Set([...value, checkbox.value])] : value.filter(item => item !== checkbox.value),
      valuesEqual: (a, b) => a.length === b.length && a.every((value, index) => value === b[index]),
      copyValue: value => [...value],
      setItemSelected: (checkbox, selected) => {
        checkbox.checked = selected
      },
      dispatchValueChange: () => {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }).make()
  )

  get value(): string[] {
    return this._value
  }

  set value(v: string[]) {
    const old = this._value
    this._value = [...v]
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
    if (attributeValue !== null) this.value = attributeValue.split(',').filter(Boolean)
    this._initialValue = [...this._value]
  }

  override updated() {
    this._syncFormValue()
    this._syncValidity()
  }

  formResetCallback() {
    this.value = [...this._initialValue]
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  private _syncFormValue() {
    if (!this._internals) return
    if (!this.name || this._value.length === 0) {
      this._internals.setFormValue?.(null)
      return
    }
    const formData = new FormData()
    this._value.forEach(value => formData.append(this.name, value))
    this._internals.setFormValue?.(formData)
  }

  private _syncValidity() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._value.length > 0) {
      this._internals.setValidity({})
      return
    }
    this._internals.setValidity({ valueMissing: true }, '请至少选择一项')
  }

  override render() {
    return html`<div class="wui-checkbox-group"><slot></slot></div>`
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-checkbox-group': WebUiCheckboxGroup
  }
}
