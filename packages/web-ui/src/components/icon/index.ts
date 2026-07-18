import type { IconifyIcon } from '@iconify/types'
import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { unsafeSVG } from 'lit/directives/unsafe-svg.js'

import style from './style.css?inline'

@customElement('web-ui-icon')
export class WebUiIcon extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ attribute: false }) icon?: IconifyIcon
  @property({ type: Boolean, reflect: true }) spin = false
  @property({ type: Number, reflect: true }) width: number = 16
  @property({ type: Number, reflect: true }) height: number = 16
  @property({ type: String, reflect: true }) color?: string

  override render() {
    if (!this.icon) return nothing

    if (this.color) {
      this.style.setProperty('--wui-icon-color', this.color)
    }

    return html`
      <svg viewBox="0 0 24 24" width="${this.width}" height="${this.height}" aria-hidden="true">
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
