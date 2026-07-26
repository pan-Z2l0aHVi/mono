import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { jamCloseCircleF } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-textarea')
export class WebUiTextarea extends LitElement {
  static formAssociated = true
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) readonly = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) clearable = false
  @property({ type: Boolean, reflect: true }) borderless = false
  @property({ type: Number, reflect: true }) rows = 3
  @property({ type: Number, reflect: true }) minlength: number | undefined
  @property({ type: Number, reflect: true }) maxlength: number | undefined
  @property({ type: Boolean, reflect: true }) autosize = false
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null
  @property({ type: String, attribute: 'aria-labelledby' }) ariaLabelledby: string | undefined

  @state() private _value = ''
  @state() private _focused = false
  @state() private _formDisabled = false
  @state() private _hasPrefix = false
  @state() private _hasSuffix = false

  private _textarea: HTMLTextAreaElement | null = null
  private _resizeObserver: ResizeObserver | null = null
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

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._teardownAutosize()
  }

  override firstUpdated() {
    this._textarea = this.shadowRoot?.querySelector('textarea') ?? null
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('_value')) {
      const textarea = this._getTextarea()
      if (textarea && textarea.value !== this._value) {
        textarea.value = this._value
      }
    }
    if (changed.has('autosize')) {
      if (this.autosize) {
        this._setupAutosize()
      } else {
        this._teardownAutosize(true)
      }
    }
    this._syncValidity()
    this.toggleAttribute('focused', this._focused)
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  formResetCallback() {
    this.value = this.getAttribute('value') || ''
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = state
  }

  private _getTextarea(): HTMLTextAreaElement | null {
    this._textarea ??= this.shadowRoot?.querySelector('textarea') ?? null
    return this._textarea
  }

  private _syncValidity() {
    const internals = this._internals
    const textarea = this._getTextarea()
    if (!internals || !textarea || typeof internals.setValidity !== 'function') return

    if (this._isDisabled || textarea.validity.valid) {
      internals.setValidity({})
      return
    }

    const validity: ValidityStateFlags = {}
    if (textarea.validity.valueMissing) validity.valueMissing = true
    if (textarea.validity.tooShort) validity.tooShort = true
    if (textarea.validity.tooLong) validity.tooLong = true
    internals.setValidity(validity, textarea.validationMessage, textarea)
  }

  private _setupAutosize() {
    this._teardownAutosize()
    if (typeof ResizeObserver === 'undefined') {
      this._autosize()
      return
    }
    this._resizeObserver = new ResizeObserver(() => {
      this._autosize()
    })
    if (this._textarea) this._resizeObserver.observe(this._textarea)
    this._autosize()
  }

  private _teardownAutosize(resetHeight = false) {
    this._resizeObserver?.disconnect()
    this._resizeObserver = null
    if (resetHeight) this._textarea?.style.removeProperty('height')
  }

  private _autosize() {
    if (!this._textarea || !this.autosize) return
    this._textarea.style.height = 'auto'
    const computedMin = this.rows * 20
    const computedMax = 300
    const scrollH = this._textarea.scrollHeight
    const clamped = Math.min(Math.max(scrollH, computedMin), computedMax)
    this._textarea.style.height = `${clamped}px`
  }

  private handleInput(e: Event) {
    if (!(e.target instanceof HTMLTextAreaElement)) return
    this._value = e.target.value
    this._internals?.setFormValue?.(this._value)
    this._syncValidity()
    this._autosize()
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
  }

  private handleNativeChange(e: Event) {
    if (!(e.target instanceof HTMLTextAreaElement)) return
    this._value = e.target.value
    this._internals?.setFormValue?.(this._value)
    this._syncValidity()
  }

  override focus() {
    this.shadowRoot?.querySelector('textarea')?.focus()
  }

  override blur() {
    this.shadowRoot?.querySelector('textarea')?.blur()
  }

  select() {
    this.shadowRoot?.querySelector('textarea')?.select()
  }

  private focusTextarea() {
    if (this._isDisabled) return
    this.shadowRoot?.querySelector('textarea')?.focus()
  }

  private _onSlotChange(e: Event) {
    if (!(e.target instanceof HTMLSlotElement)) return
    const slot = e.target
    const hasContent = slot.assignedElements().length > 0
    if (slot.name === 'prefix') this._hasPrefix = hasContent
    if (slot.name === 'suffix') this._hasSuffix = hasContent
  }

  private handleClear() {
    if (this._isDisabled) return
    this._value = ''
    this._internals?.setFormValue?.('')
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private preventMouseDownBlur(e: Event) {
    e.preventDefault()
  }

  override render() {
    const showClear = this.clearable && this._value

    return html`
      <div class="wui-glass wui-textarea-inner" @click=${this.focusTextarea}>
        <slot name="prefix" class=${classMap({ empty: !this._hasPrefix })} @slotchange=${this._onSlotChange}></slot>
        <textarea
          placeholder=${this.placeholder}
          name=${this.name}
          aria-label=${ifDefined(this.ariaLabel)}
          aria-labelledby=${ifDefined(this.ariaLabelledby)}
          .rows=${this.rows}
          minlength=${ifDefined(this.minlength)}
          maxlength=${ifDefined(this.maxlength)}
          ?disabled=${this._isDisabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          .value=${this._value}
          @input=${this.handleInput}
          @change=${this.handleNativeChange}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        ></textarea>
        ${showClear
          ? html`<span class="clear" @pointerdown=${this.preventMouseDownBlur} @click=${this.handleClear}>
              <web-ui-icon .icon=${jamCloseCircleF}></web-ui-icon>
            </span>`
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
    'web-ui-textarea': WebUiTextarea
  }
}
