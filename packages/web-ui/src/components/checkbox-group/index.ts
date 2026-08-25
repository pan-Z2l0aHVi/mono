import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'
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
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<string[]>({
    host: this,
    initialize: () => {
      const attributeValue = this.getAttribute('value')
      if (attributeValue !== null) this.value = attributeValue.split(',').filter(Boolean)
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    copyState: value => [...value],
    getFormValue: () => {
      if (!this.name || this._value.length === 0) return null
      const formData = new FormData()
      this._value.forEach(value => formData.append(this.name, value))
      return formData
    },
    getFormState: () => JSON.stringify(this._value),
    restoreState: state => {
      if (typeof state !== 'string') return
      try {
        const value = JSON.parse(state)
        if (Array.isArray(value) && value.every(item => typeof item === 'string')) this.value = value
      } catch {
        // 忽略无法解析的历史表单状态。
      }
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  formResetCallback() {
    this._formAssociation.reset()
  }

  formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    this._groupController.sync()
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this._formAssociation.restore(state)
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._value.length > 0) {
      internals.setValidity({})
      return
    }
    internals.setValidity({ valueMissing: true }, '请至少选择一项')
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
