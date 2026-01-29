import { css, html, LitElement } from 'lit'
import { customElement, property } from 'lit/decorators.js'

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static styles = css`
    :host {
      button {
        border: none;
        background: none;
        cursor: pointer;
        align-items: center;
        justify-content: center;
        gap: var(--web-ui-button-gap, 8px);
        padding: var(--web-ui-button-p-y, 4px) var(--web-ui-button-p-x, 16px);
        border-radius: 999vmax;
        font-size: var(--web-ui-button-font-size, 14px);

        font-weight: var(--web-ui-button-bold, 500);
        display: inline-flex;
        width: max-content;
        min-height: var(--web-ui-button-h, 32px);
        color: var(--web-ui-button-color, #006cf9);
        background-color: var(--web-ui-button-bg, #f0f0f6);
      }
    }
    :host([full]) {
      button {
        display: flex;
        width: 100%;
      }
    }
    :host([primary]) {
      button {
        color: var(--web-ui-button-primary-color, #fff);
        background-color: var(--web-ui-button-primary-bg, #006cf9);
      }
    }
    :host([text]) {
      button {
        color: var(--web-ui-button-primary-color, #006cf9);
        background-color: transparent;
      }
    }
    :host([icon]) {
      button {
        padding: var(--web-ui-button-p-y, 4px);
        width: var(--web-ui-button-h, 32px);
        height: var(--web-ui-button-h, 32px);
      }
    }
  `

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
