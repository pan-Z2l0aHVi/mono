import { html, LitElement, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-dropdown-header')
export class WebUiDropdownHeader extends LitElement {
  static override styles = unsafeCSS(style)

  override render() {
    return html`<div class="header"><slot></slot></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-header': WebUiDropdownHeader
  }
}
