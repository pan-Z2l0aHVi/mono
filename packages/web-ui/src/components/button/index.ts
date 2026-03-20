import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) primary = false
  @property({ type: Boolean, reflect: true }) text = false
  @property({ type: Boolean, reflect: true }) icon = false

  render() {
    return html`
      <button>
        ${this.icon
          ? html`<slot></slot>`
          : html`
              <slot name="prefix"></slot>
              <slot></slot>
              <slot name="suffix"></slot>
            `}
      </button>
    `
  }
}
