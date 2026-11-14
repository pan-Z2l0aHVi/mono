import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { styleMap } from 'lit/directives/style-map.js'

import { resolveBuiltinLabel } from '@/shared/locale/builtin-labels'
import { normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

const MAX_SAFE = Number.MAX_SAFE_INTEGER

/**
 * 线性进度指示。宿主本身承担 `progressbar` 语义，numeric props 写入后始终按 `0..max` 暴露。
 * `sport` 让按百分比定宽的 accent 条沿轨道循环滑过。
 *
 * @csspart base - 轨道与可选数值组成的网格
 * @csspart track - 进度槽
 * @csspart indicator - 已完成部分
 * @csspart value - `show-value` 时的可见百分比文本
 */
@customElement('web-ui-progress')
export class WebUiProgress extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Number, reflect: true })
  set value(value: number) {
    const normalized = normalizeNumber(value, 0, MAX_SAFE, 0)
    if (this._value === normalized) return
    const old = this.value
    this._value = normalized
    this.requestUpdate('value', old)
    if (this.getAttribute('value') !== String(normalized)) {
      this.setAttribute('value', String(normalized))
    }
  }

  get value(): number {
    return Math.min(this._value, this._max)
  }

  private _value = 0

  @property({ type: Number, reflect: true })
  set max(value: number) {
    const normalized =
      typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.min(MAX_SAFE, value) : 100
    if (this._max === normalized) return
    const old = this._max
    this._max = normalized
    this.requestUpdate('max', old)
    if (this.getAttribute('max') !== String(normalized)) {
      this.setAttribute('max', String(normalized))
    }
  }

  get max(): number {
    return this._max
  }

  private _max = 100

  /** 循环滑动的进度条：宽度由进度决定，位置由动画决定。 */
  @property({ type: Boolean, reflect: true }) sport = false
  @property({ type: Boolean, reflect: true, attribute: 'show-value' }) showValue = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncAria()
  }

  protected override updated() {
    if (this._value > this._max) {
      const old = this._value
      this._value = this._max
      this.requestUpdate('value', old)
      this.setAttribute('value', String(this._max))
    }
    this._syncAria()
  }

  private _syncAria() {
    this.setAttribute('role', 'progressbar')
    this.setAttribute('aria-valuemin', '0')
    this.setAttribute('aria-valuemax', String(this.max))
    this.setAttribute('aria-valuenow', String(this.value))

    if (!this.getAttribute('aria-label')?.trim() && !this.getAttribute('aria-labelledby')?.trim()) {
      this.setAttribute('aria-label', resolveBuiltinLabel('progress'))
    }
  }

  override render() {
    const percent = (this.value / this.max) * 100
    const valueText = `${Math.round(percent)}%`
    // translateX 的百分比相对条自身宽度；条宽是轨道的 percent%，滑过整条轨道需 10000/percent 个自身宽度。
    // percent 为 0 或极小时比值溢出为 Infinity，CSS 会丢弃整条 transform，此时退回 0%（条本身已不可见）。
    const sportRatio = 10000 / percent
    const sportShift = Number.isFinite(sportRatio) ? `${sportRatio}%` : '0%'

    return html`
      <div class="wui-progress" part="base">
        <div class="wui-progress-track" part="track">
          <div
            class="wui-progress-indicator"
            part="indicator"
            style=${styleMap({
              '--wui-progress-percent': `${percent}%`,
              ...(this.sport ? { '--wui-progress-sport-shift': sportShift } : {})
            })}
          ></div>
        </div>
        <span class="wui-progress-value" part="value" aria-hidden="true" ?hidden=${!this.showValue}>
          ${valueText}
        </span>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-progress': WebUiProgress
  }
}
