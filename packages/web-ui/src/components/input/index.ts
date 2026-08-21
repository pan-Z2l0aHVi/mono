import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { jamCloseCircleF } from '@/icons'
import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'

import style from './style.css?inline'

@customElement('web-ui-input')
export class WebUiInput extends LitElement {
  static formAssociated = true
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) type = 'text'
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) clearable = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) borderless = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  @state() private _value = ''
  @state() private _focused = false
  @state() private _hasPrefix = false
  @state() private _hasSuffix = false

  @property({ type: String, reflect: true })
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
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => this._value,
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  override updated(changed: Map<string, unknown>) {
    if (changed.has('_value')) {
      const input = this.shadowRoot?.querySelector('input')
      if (input && input.value !== this._value) {
        input.value = this._value
      }
    }
    this._syncValidity()
    this.toggleAttribute('focused', this._focused)
  }

  formResetCallback() {
    this._formAssociation.reset()
  }

  formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this._formAssociation.restore(state)
  }

  private _syncValidity() {
    const input = this.shadowRoot?.querySelector('input')
    const internals = this._formAssociation.getInternals()
    if (!internals || !input || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || input.validity.valid) {
      internals.setValidity({})
      return
    }

    const flags: ValidityStateFlags = {}
    if (input.validity.valueMissing) flags.valueMissing = true
    if (input.validity.typeMismatch) flags.typeMismatch = true
    if (input.validity.patternMismatch) flags.patternMismatch = true
    if (input.validity.tooLong) flags.tooLong = true
    if (input.validity.tooShort) flags.tooShort = true
    internals.setValidity(flags, input.validationMessage, input)
  }

  private _onSlotChange(e: Event) {
    if (!(e.target instanceof HTMLSlotElement)) return
    const slot = e.target
    const hasContent = slot.assignedElements().length > 0
    if (slot.name === 'prefix') this._hasPrefix = hasContent
    if (slot.name === 'suffix') this._hasSuffix = hasContent
  }

  private handleInput(e: Event) {
    if (this._isDisabled || this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    this._value = e.target.value
    this._formAssociation.sync()
  }

  // 原生 change 不 composed，被 shadow root 挡住；这里补发 composed 事件，
  // 兑现 $events/README 声明的公共 change 契约。
  private handleNativeChange(e: Event) {
    if (this.readonly) return
    if (!(e.target instanceof HTMLInputElement)) return
    this._value = e.target.value
    this._formAssociation.sync()
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
  }

  private handleClear() {
    if (this._isDisabled || this.readonly) return
    this._value = ''
    this._formAssociation.sync()
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private preventMouseDownBlur(e: Event) {
    e.preventDefault()
  }

  private focusInput() {
    if (this._isDisabled) return
    this.shadowRoot?.querySelector('input')?.focus()
  }

  override render() {
    // readonly 下不可清除：清空按钮会修改值，与只读语义冲突
    const showClear = this.clearable && this._value && !this.readonly

    return html`
      <div class="wui-glass wui-input-inner" @click=${this.focusInput}>
        <slot name="prefix" class=${classMap({ empty: !this._hasPrefix })} @slotchange=${this._onSlotChange}></slot>
        <input
          type=${this.type}
          placeholder=${this.placeholder}
          name=${this.name}
          aria-label=${ifDefined(this.ariaLabel)}
          ?disabled=${this._isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          .value=${this._value}
          @input=${this.handleInput}
          @change=${this.handleNativeChange}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        ${showClear
          ? html`<web-ui-button
              icon
              variant="ghost"
              size="24"
              aria-label="清除"
              @pointerdown=${this.preventMouseDownBlur}
              @click=${this.handleClear}
            >
              <web-ui-icon .icon=${jamCloseCircleF}></web-ui-icon>
            </web-ui-button>`
          : ''}
        <slot name="suffix" class=${classMap({ empty: !this._hasSuffix })} @slotchange=${this._onSlotChange}></slot>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
    focus: FocusEvent
    blur: FocusEvent
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-input': WebUiInput
  }
}
