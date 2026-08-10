import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

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
    // group-managed 子项以 bubbles:false 派发 change，须用 capture 相位才能观察到子项事件，
    // 同时该事件不会冒泡到 group 外部的同名监听器
    this.addEventListener('change', this._handleChildChange, true)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('change', this._handleChildChange, true)
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('disabled') || changed.has('_formDisabled')) this._syncValueToChildren()
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

  private _syncValueToChildren() {
    this.querySelectorAll<WebUiCheckbox>('web-ui-checkbox').forEach(checkbox => {
      checkbox.checked = this._value.includes(checkbox.value)
      checkbox.setGroupDisabled(this._isDisabled)
    })
  }

  private _handleChildChange(e: Event) {
    if (this._isDisabled) return
    const target = e.target as HTMLElement
    if (!target.matches?.('web-ui-checkbox')) return

    const checkbox = target as WebUiCheckbox
    const next = checkbox.checked
      ? [...new Set([...this._value, checkbox.value])]
      : this._value.filter(v => v !== checkbox.value)

    this.value = next
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private _handleSlotChange() {
    this._syncValueToChildren()
  }

  override render() {
    return html`<div class="wui-checkbox-group"><slot @slotchange=${this._handleSlotChange}></slot></div>`
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
