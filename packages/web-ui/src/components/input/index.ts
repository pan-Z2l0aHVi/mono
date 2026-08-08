import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { jamCloseCircleF } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-input')
export class WebUiInput extends LitElement {
  static formAssociated = true
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) type = 'text'
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) clearable = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) borderless = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  @state() private _value = ''
  @state() private _focused = false
  @state() private _formDisabled = false
  @state() private _hasPrefix = false
  @state() private _hasSuffix = false

  private _internals?: ElementInternals

  @property({ type: String, reflect: true })
  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._internals?.setFormValue?.(v)
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  override connectedCallback() {
    super.connectedCallback()
    if (!this._internals) {
      this._internals = this.attachInternals()
    }
    this._internals.setFormValue?.(this._value)
  }

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
    this.value = this.getAttribute('value') || ''
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = state
  }

  private _syncValidity() {
    const input = this.shadowRoot?.querySelector('input')
    if (!this._internals || !input || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || input.validity.valid) {
      this._internals.setValidity({})
      return
    }

    const flags: ValidityStateFlags = {}
    if (input.validity.valueMissing) flags.valueMissing = true
    if (input.validity.typeMismatch) flags.typeMismatch = true
    if (input.validity.patternMismatch) flags.patternMismatch = true
    if (input.validity.tooLong) flags.tooLong = true
    if (input.validity.tooShort) flags.tooShort = true
    this._internals.setValidity(flags, input.validationMessage, input)
  }

  private _onSlotChange(e: Event) {
    if (!(e.target instanceof HTMLSlotElement)) return
    const slot = e.target
    const hasContent = slot.assignedElements().length > 0
    if (slot.name === 'prefix') this._hasPrefix = hasContent
    if (slot.name === 'suffix') this._hasSuffix = hasContent
  }

  private handleInput(e: Event) {
    if (!(e.target instanceof HTMLInputElement)) return
    this._value = e.target.value
    this._internals?.setFormValue?.(this._value)
    this._syncValidity()
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
  }

  private handleClear() {
    if (this._isDisabled) return
    this._value = ''
    this._internals?.setFormValue?.('')
    this._syncValidity()
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
    const showClear = this.clearable && this._value

    return html`
      <div class="wui-glass wui-input-inner" @click=${this.focusInput}>
        <slot name="prefix" class=${classMap({ empty: !this._hasPrefix })} @slotchange=${this._onSlotChange}></slot>
        <input
          type=${this.type}
          placeholder=${this.placeholder}
          name=${this.name}
          aria-label=${ifDefined(this.ariaLabel)}
          ?disabled=${this._isDisabled}
          ?required=${this.required}
          .value=${this._value}
          @input=${this.handleInput}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        ${showClear
          ? html`<button
              type="button"
              class="clear"
              aria-label="清除"
              @pointerdown=${this.preventMouseDownBlur}
              @click=${this.handleClear}
            >
              <web-ui-icon .icon=${jamCloseCircleF}></web-ui-icon>
            </button>`
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
