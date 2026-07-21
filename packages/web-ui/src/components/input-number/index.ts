import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideMinus, lucidePlus } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-input-number')
export class WebUiInputNumber extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Number, reflect: true }) value = 0
  @property({ type: Number }) min = 0
  @property({ type: Number }) max = Infinity
  @property({ type: Number, reflect: true }) precision = 0
  @property({ type: Boolean, reflect: true }) disabled = false

  private get atMin(): boolean {
    return this.value <= this.min
  }

  private get atMax(): boolean {
    return this.value >= this.max
  }

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value') || changed.has('precision')) {
      this.value = this.clamp(this.round(this.value))
    }
  }

  private clamp(v: number): number {
    return Math.min(this.max, Math.max(this.min, v))
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
    if (this.disabled) return
    const step = 10 ** -this.precision
    this.setValueAndNotify(this.value + direction * step)
  }

  private handleInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value
    if (raw === '' || raw === '-') return
    this.setValueAndNotify(Number(raw))
  }

  override render() {
    return html`
      <div class="wui-glass wui-glass-no-after wui-input-inner">
        <button class="num-btn" ?disabled=${this.disabled || this.atMin} @click=${() => this.handleStep(-1)}>
          <web-ui-icon .icon=${lucideMinus}></web-ui-icon>
        </button>
        <input type="number" .value=${String(this.value)} ?disabled=${this.disabled} @input=${this.handleInput} />
        <button class="num-btn" ?disabled=${this.disabled || this.atMax} @click=${() => this.handleStep(1)}>
          <web-ui-icon .icon=${lucidePlus}></web-ui-icon>
        </button>
      </div>
    `
  }
}

export interface WebUiInputNumber {
  readonly $events: {
    input: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-input-number': WebUiInputNumber
  }
}
