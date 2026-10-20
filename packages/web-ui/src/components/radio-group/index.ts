import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import type { WebUiRadio } from '../radio'

import style from './style.css?inline'

const ALLOWED_DIRECTIONS = ['horizontal', 'vertical'] as const

@customElement('web-ui-radio-group')
export class WebUiRadioGroup extends FormAssociated(LitElement) {
  static override styles = unsafeCSS(style)
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  @property({ type: String, reflect: true })
  get direction(): 'horizontal' | 'vertical' {
    return this._direction
  }
  set direction(v: string) {
    const old = this._direction
    this._direction = normalizeLiteral(v, ALLOWED_DIRECTIONS, 'vertical')
    this.requestUpdate('direction', old)
  }
  private _direction: 'horizontal' | 'vertical' = 'vertical'

  @state() private _value = ''

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
      // 选中判定按元素身份而非 value 相等：value 重复时按值比较会把多个成员
      // 同时标为选中，破坏单选不变式。重复值取第一个匹配（或已选中的那个，
      // 避免每次 sync 把选中项跳回第一个）。
      isItemSelected: (radio, value) => {
        if (!value) return false
        let selected: WebUiRadio | undefined
        for (const item of this.querySelectorAll<WebUiRadio>('web-ui-radio')) {
          if (item.value !== value) continue
          if (!selected) selected = item
          if (item.checked) {
            selected = item
            break
          }
        }
        return radio === selected
      },
      getNextValue: (radio, value) => (radio.checked ? radio.value : value),
      valuesEqual: (a, b) => a === b,
      copyValue: value => value,
      setItemSelected: (radio, selected) => {
        radio.checked = selected
      },
      // 点击同值成员时 value 不变，仍需把选中态收到被点击的那一项
      resyncOnUnchangedValue: clicked => {
        for (const radio of this.querySelectorAll<WebUiRadio>('web-ui-radio')) {
          radio.checked = radio === clicked
        }
      },
      dispatchValueChange: () => {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }).make(),
    // 每次成员集合同步后把组值剪到现存成员范围内
    { afterSync: () => this._pruneRemovedMembers() }
  )

  /**
   * 成员被移除后，组值若仍指向它就成了幽灵值（表单照旧提交一个不存在的 option）。
   * 剪枝条件是「曾经出现在成员里、现在消失了」——不能用「不在现存成员里就剪」，
   * 否则 v-if / 异步渲染时先于成员到达的合法组值会被误清。
   */
  private _knownMemberValues = new Set<string>()

  private _pruneRemovedMembers() {
    if (!this._value) return
    const items = [...this.querySelectorAll<WebUiRadio>('web-ui-radio')]
    if (items.length === 0) return
    const alive = new Set(items.map(item => item.value))
    if (!alive.has(this._value) && this._knownMemberValues.has(this._value)) this.value = ''
    this._knownMemberValues = alive
  }

  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    initialize: () => {
      const attributeValue = this.getAttribute('value')
      if (attributeValue !== null) this.value = attributeValue
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => (this.name && this._value ? this._value : null),
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  override formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    this._groupController.sync()
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._value) {
      internals.setValidity({})
      return
    }
    internals.setValidity({ valueMissing: true }, 'Select an option')
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
