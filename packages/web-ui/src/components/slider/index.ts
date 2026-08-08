import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

@customElement('web-ui-slider')
export class WebUiSlider extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  static formAssociated = true

  // ElementInternals 实例，在 connectedCallback 中初始化
  private _internals?: ElementInternals
  @state() private _formDisabled = false

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) marks = false
  @property({ type: Boolean, reflect: true }) vertical = false
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) required = false

  // value 使用访问器模式同步 ElementInternals
  private _value = 0
  private _initialValue = 0
  @property({ type: Number, reflect: true })
  get value(): number {
    return this._value
  }
  set value(v: number) {
    const normalized = normalizeNumber(v, -Infinity, Infinity, 0)
    const old = this._value
    this._value = normalized
    this._internals?.setFormValue?.(String(normalized))
    this.requestUpdate('value', old)
  }

  private _min = 0
  @property({ type: Number, reflect: true })
  get min(): number {
    return this._min
  }
  set min(v: number) {
    this._min = normalizeNumber(v, -Infinity, Infinity, 0)
  }

  private _max = 100
  @property({ type: Number, reflect: true })
  get max(): number {
    return this._max
  }
  set max(v: number) {
    this._max = normalizeNumber(v, -Infinity, Infinity, 100)
  }

  private _step = 1
  @property({ type: Number, reflect: true })
  get step(): number {
    return this._step
  }
  set step(v: number) {
    this._step = normalizeNumber(v, -Infinity, Infinity, 1)
  }

  @state() private _dragging = false
  // 避免未改变数值的点击被误认为一次表单提交
  private _interactionStartValue: number | undefined

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  override connectedCallback() {
    super.connectedCallback()
    this._internals = this.attachInternals()
    this._initialValue = Number(this.getAttribute('value')) || 0
    this._internals?.setFormValue?.(String(this._value))
  }

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('min') || changed.has('max') || changed.has('step')) {
      const normalizedValue = this._normalizeValue(this.value)
      if (normalizedValue !== this.value) this.value = normalizedValue
    }
  }

  formResetCallback() {
    this.value = this._initialValue
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  override updated() {
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required) this._internals.setValidity({})
    else this._internals.setValidity({})
  }

  // 将焦点移至滑块，供表单或外部控制使用
  override focus(options?: FocusOptions) {
    this._slider?.focus(options)
  }

  // 移除滑块焦点
  override blur() {
    this._slider?.blur()
  }

  private get _slider(): HTMLDivElement | null {
    return this.renderRoot.querySelector<HTMLDivElement>('[role="slider"]')
  }

  private get _range(): number {
    return Math.max(0, this.max - this.min)
  }

  private get _percent(): number {
    return this._range === 0 ? 0 : ((this.value - this.min) / this._range) * 100
  }

  private get _markValues(): number[] {
    if (!this.marks || this._range === 0) return []
    const count = Math.min(100, Math.floor(this._range / this._safeStep))
    return Array.from({ length: count + 1 }, (_, index) => this.min + index * this._safeStep)
  }

  private get _safeStep(): number {
    return Number.isFinite(this.step) && this.step > 0 ? this.step : 1
  }

  private _normalizeValue(value: number): number {
    if (!Number.isFinite(value)) return this.min
    const lower = Math.min(this.min, this.max)
    const upper = Math.max(this.min, this.max)
    const clamped = Math.min(upper, Math.max(lower, value))
    const steps = Math.round((clamped - lower) / this._safeStep)
    return Number((lower + steps * this._safeStep).toFixed(this._precision))
  }

  private get _precision(): number {
    return Math.max(this._decimalPlaces(this.min), this._decimalPlaces(this.max), this._decimalPlaces(this._safeStep))
  }

  private _decimalPlaces(value: number): number {
    const [, decimal = ''] = String(value).split('.')
    return decimal.length
  }

  private _setValue(value: number): boolean {
    if (this._isDisabled) return false
    const nextValue = this._normalizeValue(value)
    if (nextValue === this.value) return false
    this.value = nextValue
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    return true
  }

  private _setValueFromPointer(event: PointerEvent): boolean {
    const track = event.currentTarget as HTMLElement
    const rect = track.getBoundingClientRect()
    if (this.vertical) {
      if (rect.height <= 0) return false
      // 视觉上的数值从下往上增长，与坐标系相反。
      const ratio = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height))
      return this._setValue(this.min + ratio * this._range)
    }
    if (rect.width <= 0) return false
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
    return this._setValue(this.min + ratio * this._range)
  }

  private _handlePointerDown(event: PointerEvent) {
    if (this._isDisabled) return
    const track = event.currentTarget as HTMLElement
    track.setPointerCapture?.(event.pointerId)
    this._interactionStartValue = this.value
    this._dragging = true
    this._setValueFromPointer(event)
  }

  private _handlePointerMove(event: PointerEvent) {
    if (!this._dragging) return
    this._setValueFromPointer(event)
  }

  private _handlePointerUp(event: PointerEvent) {
    if (!this._dragging) return
    this._setValueFromPointer(event)
    this._dragging = false
    if (this._interactionStartValue !== this.value) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
    this._interactionStartValue = undefined
  }

  private _handleKeyDown(event: KeyboardEvent) {
    if (this._isDisabled) return
    const pageStep = this._safeStep * 10
    const keyValues: Record<string, number> = {
      ArrowDown: this.value - this._safeStep,
      ArrowLeft: this.value - this._safeStep,
      ArrowUp: this.value + this._safeStep,
      ArrowRight: this.value + this._safeStep,
      PageDown: this.value - pageStep,
      PageUp: this.value + pageStep,
      Home: this.min,
      End: this.max
    }
    const nextValue = keyValues[event.key]
    if (nextValue === undefined) return
    event.preventDefault()
    if (this._setValue(nextValue)) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    const trackClass = classMap({
      'wui-slider-track': true,
      'is-disabled': this._isDisabled
    })
    const thumbClass = classMap({
      'wui-slider-thumb': true,
      'wui-glass': true,
      'is-dragging': this._dragging
    })
    const trackStyle = styleMap({ '--percent': `${this._percent}%` })

    return html`
      <div
        class=${trackClass}
        style=${trackStyle}
        role="slider"
        tabindex=${this._isDisabled ? '-1' : '0'}
        aria-label="滑块"
        aria-orientation=${this.vertical ? 'vertical' : 'horizontal'}
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.value}
        aria-disabled=${String(this._isDisabled)}
        @keydown=${this._handleKeyDown}
        @pointerdown=${this._handlePointerDown}
        @pointermove=${this._handlePointerMove}
        @pointerup=${this._handlePointerUp}
        @pointercancel=${this._handlePointerUp}
      >
        <div class="wui-slider-progress"></div>
        <div class="wui-slider-marks">
          ${this._markValues.map(
            mark =>
              html`<span
                class="wui-slider-mark"
                style=${styleMap({ '--percent': `${((mark - this.min) / this._range) * 100}%` })}
              ></span>`
          )}
        </div>
        <div class=${thumbClass}></div>
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
    'web-ui-slider': WebUiSlider
  }
}
