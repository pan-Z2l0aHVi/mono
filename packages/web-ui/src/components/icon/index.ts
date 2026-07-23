import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

import style from './style.css?inline'

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
    const viewBox = `${this.icon.left ?? 0} ${this.icon.top ?? 0} ${this.icon.width ?? 24} ${this.icon.height ?? 24}`

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

export interface WebUiIcon {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-icon': WebUiIcon
  }
}
