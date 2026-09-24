import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

import style from './style.css?inline'

/*
 * Iconify 规范里 width/height 缺省即 16（见 @iconify/types README），这里必须跟规范一致：
 * 猜成别的值不会报错，只会把图形按错误比例缩放并偏到画布一角。生成资产已自带尺寸，
 * 这条兜底服务的是直接喂进来的原始 IconifyIcon 对象。
 */
const ICONIFY_DEFAULT_CANVAS = 16

@customElement('web-ui-icon')
export class WebUiIcon extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ attribute: false }) icon?: IconifyIcon
  @property({ type: Boolean, reflect: true }) spin = false
  @property({ type: Number, reflect: true }) size: number = 18
  @property({ type: String, reflect: true }) color?: string

  override render() {
    if (!this.icon) return nothing

    const svgStyle = this.color ? `color: ${this.color}` : ''
    const viewBox = `${this.icon.left ?? 0} ${this.icon.top ?? 0} ${this.icon.width ?? ICONIFY_DEFAULT_CANVAS} ${this.icon.height ?? ICONIFY_DEFAULT_CANVAS}`

    return html`
      <svg
        class=${classMap({ spin: this.spin })}
        style=${svgStyle}
        viewBox="${viewBox}"
        width="${this.size}"
        height="${this.size}"
        aria-hidden="true"
      >
        ${unsafeSVG(this.icon.body)}
      </svg>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-icon': WebUiIcon
  }
}
