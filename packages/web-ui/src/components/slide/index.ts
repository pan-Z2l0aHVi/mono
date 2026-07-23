import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-slide')
export class WebUiSlide extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Number, reflect: true }) value = 0
  @property({ type: Number, reflect: true }) min = 0
  @property({ type: Number, reflect: true }) max = 100
  @property({ type: Number, reflect: true }) step = 1
  @property({ type: Boolean, reflect: true }) marks = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) glass = false
  @state() private dragging = false

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

  private setValue(value: number, eventType: 'input' | 'change') {
    if (this.disabled) return
    const nextValue = this.normalizeValue(value)
    if (nextValue === this.value) return
    this.value = nextValue
    this.dispatchEvent(new Event(eventType, { bubbles: true, composed: true }))
  }

  private setValueFromPointer(event: PointerEvent, eventType: 'input' | 'change') {
    const track = event.currentTarget as HTMLElement
    const { left, width } = track.getBoundingClientRect()
    if (width <= 0) return
    const ratio = Math.min(1, Math.max(0, (event.clientX - left) / width))
    this.setValue(this.min + ratio * this.range, eventType)
  }

  private handlePointerDown(event: PointerEvent) {
    if (this.disabled) return
    const track = event.currentTarget as HTMLElement
    track.setPointerCapture?.(event.pointerId)
    this.dragging = true
    this.setValueFromPointer(event, 'input')
    this.focus()
  }

  private handlePointerMove(event: PointerEvent) {
    if (!this.dragging) return
    this.setValueFromPointer(event, 'input')
  }

  private handlePointerUp(event: PointerEvent) {
    if (!this.dragging) return
    this.setValueFromPointer(event, 'input')
    this.dragging = false
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
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
    const previousValue = this.value
    this.setValue(nextValue, 'input')
    if (this.value !== previousValue) this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    const trackClass = classMap({
      'wui-slide-track': true,
      'is-disabled': this.disabled
    })
    const thumbClass = classMap({
      'wui-slide-thumb': true,
      'wui-glass': this.glass,
      'wui-glass-no-after': this.glass,
      'is-dragging': this.dragging
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
        <div class="wui-slide-progress" style=${progressStyle}></div>
        ${this.markValues.map(
          mark =>
            html`<span
              class="wui-slide-mark"
              style=${styleMap({ left: `${((mark - this.min) / this.range) * 100}%` })}
            ></span>`
        )}
        <div class=${thumbClass} style=${styleMap({ left: `${this.percent}%` })}></div>
      </div>
    `
  }
}

export interface WebUiSlide {
  readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-slide': WebUiSlide
  }
}
