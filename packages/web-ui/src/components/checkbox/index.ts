import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import { heroiconsCheck16Solid } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-checkbox')
export class WebUiCheckbox extends LitElement {
  static override styles = unsafeCSS(style)
  static formAssociated = true

  // 内部表单关联实例（connectedCallback 中初始化）
  private _internals?: ElementInternals
  @state() private _formDisabled = false
  @state() private _groupDisabled = false

  // 内部 checked 状态，通过 getter/setter 暴露为公共 API
  @state() private _checked = false

  get checked(): boolean {
    return this._checked
  }

  set checked(v: boolean) {
    const old = this._checked
    this._checked = v
    this._syncFormValue()
    this.requestUpdate('checked', old)
  }

  @property({ type: String }) value = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled || this._groupDisabled
  }

  private get _isManagedByGroup(): boolean {
    return this.closest('web-ui-checkbox-group') !== null
  }

  setGroupDisabled(disabled: boolean) {
    this._groupDisabled = disabled
  }

  override connectedCallback() {
    super.connectedCallback()
    if (this._internals) return
    this._internals = this.attachInternals()
    if (this.hasAttribute('checked')) {
      this._checked = true
    }
    this._syncFormValue()
  }

  formResetCallback() {
    this.checked = this.hasAttribute('checked')
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  override updated() {
    this._syncFormValue()
    this._syncValidity()
  }

  private _syncFormValue() {
    this._internals?.setFormValue?.(!this._isManagedByGroup && this._checked ? this.value || 'on' : null)
  }

  private _syncValidity() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || this._isManagedByGroup || !this.required || this._checked) {
      this._internals.setValidity({})
      return
    }
    this._internals.setValidity({ valueMissing: true }, '请选择此项')
  }

  // 用户点击切换
  private handleClick() {
    if (this._isDisabled) return
    const old = this._checked
    this._checked = !old
    this._syncFormValue()
    this.requestUpdate('checked', old)
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.handleClick()
    }
  }

  override render() {
    const cls = {
      'wui-checkbox': true,
      'is-checked': this._checked,
      'is-disabled': this._isDisabled
    }

    return html`
      <label
        class=${classMap(cls)}
        tabindex=${this._isDisabled ? '-1' : '0'}
        role="checkbox"
        aria-checked=${String(this._checked)}
        aria-disabled=${String(this._isDisabled)}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <span class="wui-checkbox-box">
          <span class="wui-checkbox-icon"
            ><web-ui-icon .icon=${heroiconsCheck16Solid} size="18" color="#fff"></web-ui-icon
          ></span>
        </span>
        <span class="wui-checkbox-label"><slot></slot></span>
      </label>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-checkbox': WebUiCheckbox
  }
}
