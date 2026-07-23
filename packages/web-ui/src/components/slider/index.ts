import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-slider')
export class WebUiSlider extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Number, reflect: true }) value = 0
  @property({ type: Number, reflect: true }) min = 0
  @property({ type: Number, reflect: true }) max = 100
  @property({ type: Number, reflect: true }) step = 1
  @property({ type: Boolean, reflect: true }) marks = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @state() private dragging = false
  // 避免未改变数值的点击被误认为一次表单提交。
  private interactionStartValue: number | undefined

  override willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('min') || changed.has('max') || changed.has('step')) {
      const normalizedValue = this.normalizeValue(this.value)
      if (normalizedValue !== this.value) this.value = normalizedValue
    }
  }

  /** 将焦点移至滑块，供表单或外部控制使用。 */
  override focus(options?: FocusOptions) {
    this.slider?.focus(options)
  }

  /** 移除滑块焦点。 */
  override blur() {
    this.slider?.blur()
  }

  private get slider(): HTMLDivElement | null {
    return this.renderRoot.querySelector<HTMLDivElement>('[role="slider"]')
  }

  private get range(): number {
    return Math.max(0, this.max - this.min)
  }

  private get percent(): number {
    return this.range === 0 ? 0 : ((this.value - this.min) / this.range) * 100
  }

  private get markValues(): number[] {
    if (!this.marks || this.range === 0) return []
    const count = Math.min(100, Math.floor(this.range / this.safeStep))
    return Array.from({ length: count + 1 }, (_, index) => this.min + index * this.safeStep)
  }

  private get safeStep(): number {
    return Number.isFinite(this.step) && this.step > 0 ? this.step : 1
  }

  private normalizeValue(value: number): number {
    if (!Number.isFinite(value)) return this.min
    const lower = Math.min(this.min, this.max)
    const upper = Math.max(this.min, this.max)
    const clamped = Math.min(upper, Math.max(lower, value))
    const steps = Math.round((clamped - lower) / this.safeStep)
    return Number((lower + steps * this.safeStep).toFixed(this.precision))
  }

  private get precision(): number {
    return Math.max(this.decimalPlaces(this.min), this.decimalPlaces(this.max), this.decimalPlaces(this.safeStep))
  }

  private decimalPlaces(value: number): number {
    const [, decimal = ''] = String(value).split('.')
    return decimal.length
  }

  private setValue(value: number): boolean {
    if (this.disabled) return false
    const nextValue = this.normalizeValue(value)
    if (nextValue === this.value) return false
    this.value = nextValue
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    return true
  }

  private setValueFromPointer(event: PointerEvent): boolean {
    const track = event.currentTarget as HTMLElement
    const { left, width } = track.getBoundingClientRect()
    if (width <= 0) return false
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width))
    return this.setValue(this.min + ratio * this.range)
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.disabled) return
    const track = event.currentTarget as HTMLElement
    track.setPointerCapture?.(event.pointerId)
    this.interactionStartValue = this.value
    this.dragging = true
    this.setValueFromPointer(event)
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.dragging) return
    this.setValueFromPointer(event)
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.dragging) return
    this.setValueFromPointer(event)
    this.dragging = false
    if (this.interactionStartValue !== this.value) {
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
    }
    this.interactionStartValue = undefined
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.disabled) return
    const pageStep = this.safeStep * 10
    const keyValues: Record<string, number> = {
      ArrowDown: this.value - this.safeStep,
      ArrowLeft: this.value - this.safeStep,
      ArrowUp: this.value + this.safeStep,
      ArrowRight: this.value + this.safeStep,
      PageDown: this.value - pageStep,
      PageUp: this.value + pageStep,
      Home: this.min,
      End: this.max
    }
    const nextValue = keyValues[event.key]
    if (nextValue === undefined) return
    event.preventDefault()
    if (this.setValue(nextValue)) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    const trackClass = classMap({
      'wui-slider-track': true,
      'is-disabled': this.disabled
    })
    const thumbClass = classMap({
      'wui-slider-thumb': true,
      'wui-glass': this.dragging
    })
    const progressStyle = styleMap({ width: `${this.percent}%` })

    return html`
      <div
        class=${trackClass}
        role="slider"
        tabindex=${this.disabled ? -1 : 0}
        aria-label="滑块"
        aria-valuemin=${this.min}
        aria-valuemax=${this.max}
        aria-valuenow=${this.value}
        aria-disabled=${String(this.disabled)}
        @keydown=${this.handleKeyDown}
        @pointerdown=${this.handlePointerDown}
        @pointermove=${this.handlePointerMove}
        @pointerup=${this.handlePointerUp}
        @pointercancel=${this.handlePointerUp}
      >
        <div class="wui-slider-progress" style=${progressStyle}></div>
        <div class="wui-slider-marks">
          ${this.markValues.map(
            mark =>
              html`<span
                class="wui-slider-mark"
                style=${styleMap({ left: `${((mark - this.min) / this.range) * 100}%` })}
              ></span>`
          )}
        </div>
        <div class=${thumbClass} style=${styleMap({ left: `${this.percent}%` })}></div>
      </div>
    `
  }
}

export interface WebUiSlider {
  readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-slider': WebUiSlider
  }
}
