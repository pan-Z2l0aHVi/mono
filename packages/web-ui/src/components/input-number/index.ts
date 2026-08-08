import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideMinus, lucidePlus } from '@/icons'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

@customElement('web-ui-input-number')
export class WebUiInputNumber extends LitElement {
  static formAssociated = true
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Number, reflect: true })
  get precision(): number {
    return this._precision
  }
  // 精度变化时重算现有值，避免浮点累积误差
  set precision(v: number) {
    const old = this._precision
    this._precision = v
    const current = this.clamp(this.round(this._value))
    if (current !== this._value) {
      this._value = current
      this._internals?.setFormValue?.(String(current))
    }
    this.requestUpdate('precision', old)
  }

  @state() private _value = 0
  @state() private _min = 0
  @state() private _max = Infinity
  @state() private _step = 1
  @state() private _focused = false
  @state() private _formDisabled = false
  private _precision = 0

  private _internals?: ElementInternals

  @property({ type: Number, reflect: true })
  get value(): number {
    return this._value
  }

  set value(v: number) {
    const clamped = this.clamp(this.round(v))
    const old = this._value
    this._value = clamped
    this._internals?.setFormValue?.(String(clamped))
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  @property({ type: Number })
  get min(): number {
    return this._min
  }

  set min(v: unknown) {
    this._min = normalizeNumber(v, -Infinity, Infinity, 0)
  }

  @property({ type: Number })
  get max(): number {
    return this._max
  }

  set max(v: unknown) {
    this._max = normalizeNumber(v, -Infinity, Infinity, Infinity)
  }

  @property({ type: Number })
  get step(): number {
    return this._step
  }

  // 步进值，默认 1；若声明了 precision 则以 precision 退化步进
  set step(v: unknown) {
    this._step = normalizeNumber(v, 0, Infinity, 1)
  }

  private get _effectiveStep(): number {
    return this._step
  }

  private get atMin(): boolean {
    return this._value <= this._min
  }

  private get atMax(): boolean {
    return this._value >= this._max
  }

  override connectedCallback() {
    super.connectedCallback()
    if (!this._internals) {
      this._internals = this.attachInternals()
    }
    this._internals.setFormValue?.(String(this._value))
  }

  formResetCallback() {
    const attr = this.getAttribute('value')
    this.value = attr !== null ? Number(attr) : 0
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    if (typeof state === 'string') this.value = Number(state)
  }

  override updated() {
    this._syncValidity()
    this.toggleAttribute('focused', this._focused)
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
    if (input.validity.rangeUnderflow) flags.rangeUnderflow = true
    if (input.validity.rangeOverflow) flags.rangeOverflow = true
    if (input.validity.stepMismatch) flags.stepMismatch = true
    this._internals.setValidity(flags, input.validationMessage, input)
  }

  private clamp(v: number): number {
    return Math.min(this._max, Math.max(this._min, v))
  }

  private round(v: number): number {
    const f = 10 ** this.precision
    return Math.round(v * f) / f
  }

  private setValueAndNotify(v: number) {
    this.value = this.clamp(this.round(v))
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private handleStep(direction: 1 | -1) {
    if (this._isDisabled) return
    this.setValueAndNotify(this._value + direction * this._effectiveStep)
  }

  private handleInput(e: Event) {
    if (!(e.target instanceof HTMLInputElement)) return
    const raw = e.target.value
    if (raw === '' || raw === '-') return
    this._value = this.clamp(this.round(Number(raw)))
    this._internals?.setFormValue?.(String(this._value))
    this._syncValidity()
  }

  private handleKeydown(e: KeyboardEvent) {
    if (this._isDisabled) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      this.setValueAndNotify(this._value + this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.setValueAndNotify(this._value - this._effectiveStep)
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
  }

  private handleFocus() {
    if (!this._isDisabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
  }

  override render() {
    return html`
      <div class="wui-glass wui-input-inner">
        <button
          class="num-btn"
          aria-label="Decrease"
          ?disabled=${this._isDisabled || this.atMin}
          @click=${() => this.handleStep(-1)}
        >
          <web-ui-icon .icon=${lucideMinus}></web-ui-icon>
        </button>
        <input
          type="number"
          placeholder=${this.placeholder}
          name=${this.name}
          .value=${String(this._value)}
          ?disabled=${this._isDisabled}
          ?required=${this.required}
          @input=${this.handleInput}
          @keydown=${this.handleKeydown}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        <button
          class="num-btn"
          aria-label="Increase"
          ?disabled=${this._isDisabled || this.atMax}
          @click=${() => this.handleStep(1)}
        >
          <web-ui-icon .icon=${lucidePlus}></web-ui-icon>
        </button>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-input-number': WebUiInputNumber
  }
}
