import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import type { WebUiRadio } from '../radio'
import { activateRadio, focusRadio, isRadioDisabled } from '../radio/interaction'

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

  private _getRadios(): WebUiRadio[] {
    return [...this.querySelectorAll<WebUiRadio>('web-ui-radio')].filter(
      radio => radio.closest('web-ui-radio-group') === this
    )
  }

  private _findSelectedRadio(radios: readonly WebUiRadio[], value: string): WebUiRadio | undefined {
    if (!value) return undefined
    const matching = radios.filter(radio => radio.value === value)
    return matching.find(radio => radio.checked) ?? matching[0]
  }

  private _getRovingTabStop(radio: WebUiRadio, radios: readonly WebUiRadio[], value: string): boolean {
    if (this._isDisabled || isRadioDisabled(radio)) return false
    const enabled = radios.filter(item => !isRadioDisabled(item))
    const selected = enabled.find(item => item.checked) ?? this._findSelectedRadio(enabled, value)
    return radio === (selected ?? enabled[0])
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (this._isDisabled || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const target = event.target
    if (!(target instanceof HTMLElement) || !target.matches('web-ui-radio') || !this.contains(target)) return

    const radios = this._getRadios()
    const targetRadio = target as WebUiRadio
    const targetIndex = radios.indexOf(targetRadio)
    if (targetIndex < 0) return

    const enabledRadios = radios.filter(radio => !isRadioDisabled(radio))
    if (enabledRadios.length === 0) return
    const currentIndex = enabledRadios.indexOf(targetRadio)

    let nextRadio: WebUiRadio | undefined
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        if (currentIndex >= 0) {
          nextRadio = enabledRadios[(currentIndex - 1 + enabledRadios.length) % enabledRadios.length]
        } else {
          for (let step = 1; step <= radios.length; step++) {
            const candidate = radios[(targetIndex - step + radios.length) % radios.length]
            if (!isRadioDisabled(candidate)) {
              nextRadio = candidate
              break
            }
          }
        }
        break
      case 'ArrowDown':
      case 'ArrowRight':
        if (currentIndex >= 0) {
          nextRadio = enabledRadios[(currentIndex + 1) % enabledRadios.length]
        } else {
          for (let step = 1; step <= radios.length; step++) {
            const candidate = radios[(targetIndex + step) % radios.length]
            if (!isRadioDisabled(candidate)) {
              nextRadio = candidate
              break
            }
          }
        }
        break
      case 'Home':
        nextRadio = enabledRadios[0]
        break
      case 'End':
        nextRadio = enabledRadios[enabledRadios.length - 1]
        break
      default:
        return
    }

    if (!nextRadio) return
    event.preventDefault()
    focusRadio(nextRadio)
    if (!nextRadio.checked) activateRadio(nextRadio)
  }

  private readonly _groupController = new GroupController(
    this,
    defineGroupCoordinator<WebUiRadio, string>({
      host: this,
      getItems: () => this._getRadios(),
      getValue: () => this._value,
      setValue: value => {
        this.value = value
      },
      getDisabled: () => this._isDisabled,
      isItem: (target): target is WebUiRadio =>
        target instanceof HTMLElement &&
        target.matches('web-ui-radio') &&
        target.closest('web-ui-radio-group') === this,
      // 选中判定按元素身份而非 value 相等：value 重复时按值比较会把多个成员
      // 同时标为选中，破坏单选不变式。重复值取第一个匹配（或已选中的那个，
      // 避免每次 sync 把选中项跳回第一个）。
      isItemSelected: (radio, value) => radio === this._findSelectedRadio(this._getRadios(), value),
      getNextValue: (radio, value) => (radio.checked ? radio.value : value),
      valuesEqual: (a, b) => a === b,
      copyValue: value => value,
      setItemSelected: (radio, selected) => {
        radio.checked = selected
      },
      getRovingTabStop: (radio, _index, radios, value) => this._getRovingTabStop(radio, radios, value),
      handleKeyDown: event => this._handleKeyDown(event),
      // 点击同值成员时 value 不变，仍需把选中态收到被点击的那一项
      resyncOnUnchangedValue: clicked => {
        for (const radio of this._getRadios()) {
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
    const items = this._getRadios()
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
