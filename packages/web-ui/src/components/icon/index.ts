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

  override render() {
    if (!this.icon) return nothing

    return html`
      <svg viewBox="0 0 ${this.icon.width} ${this.icon.height}" width="1em" height="1em" aria-hidden="true">
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
