import { html, LitElement, unsafeCSS } from 'lit'
import { customElement } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-dropdown-divider')
export class WebUiDropdownDivider extends LitElement {
  static override styles = unsafeCSS(style)

  override render() {
    return html`<div class="divider" role="separator"></div>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-divider': WebUiDropdownDivider
  }
}
