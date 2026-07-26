import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'

import style from './style.css?inline'

const LEAF_COUNT = 8

export class WebUiSpinner extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Number, reflect: true }) size = 24
  @property({ type: String }) description!: string

  /** 显示全屏居中 spinner（自动创建并挂载） */
  static show(options?: { size?: number; duration?: number; description?: string }): WebUiSpinner {
    const el = document.createElement('web-ui-spinner') as WebUiSpinner
    el._imperative = true
    if (options?.size) el.size = options.size
    if (options?.description) el.description = options.description
    document.body.appendChild(el)
    if (options?.duration && options.duration > 0) {
      el._timer = window.setTimeout(() => WebUiSpinner.hide(), options.duration)
    }
    return el
  }

  /** 隐藏并销毁全屏 spinner */
  static hide() {
    if (WebUiSpinner._current?._timer) {
      clearTimeout(WebUiSpinner._current._timer)
      WebUiSpinner._current._timer = undefined
    }
    WebUiSpinner._current?.remove()
    WebUiSpinner._current = undefined
  }

  /** @internal 当前命令式实例 */
  static _current?: WebUiSpinner

  /** @internal */
  _imperative = false
  /** @internal */
  _timer?: ReturnType<typeof setTimeout>

  override connectedCallback() {
    super.connectedCallback()
    if (this._imperative) {
      WebUiSpinner._current?.remove()
      WebUiSpinner._current = this
      this.classList.add('wui-spinner-overlay')
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = undefined
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (props.has('size')) {
      this.style.setProperty('--wui-spinner-size', `${this.size}px`)
    }
  }

  override render() {
    const spinner = html`
      <div class="wui-spinner">
        ${repeat(
          Array.from({ length: LEAF_COUNT }, (_, i) => i),
          i =>
            html`<span
              style="transform:rotate(${i * 45}deg);animation-delay:calc(-${LEAF_COUNT - i} / ${LEAF_COUNT} * 0.8s)"
            ></span>`
        )}
      </div>
      ${this.description ? html`<div class="spinner-description">${this.description}</div>` : nothing}
      <slot name="description"></slot>
    `
    return this._imperative ? html`<div class="wui-spinner-overlay">${spinner}</div>` : spinner
  }
}

@customElement('web-ui-spinner')
export class WebUiSpinnerElement extends WebUiSpinner {}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-spinner': WebUiSpinner
  }
}
