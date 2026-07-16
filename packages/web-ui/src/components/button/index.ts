import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String, reflect: true }) variant: 'primary' | 'secondary' | 'ghost' | 'danger' = 'primary'
  @property({ type: String, reflect: true }) size: 'small' | 'medium' | 'large' = 'medium'
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) loading = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) icon = false

  private handleClick(e: Event) {
    if (this.disabled || this.loading) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  override render() {
    return html`
      <button ?disabled=${this.disabled || this.loading} @click=${this.handleClick}>
        ${this.loading
          ? html`<iconify-icon class="spinner" icon="lucide:loader-2" width="1em" height="1em"></iconify-icon>`
          : ''}
        ${this.icon
          ? html`<slot></slot>`
          : html`
              <slot name="prefix"></slot>
              <span class="label"><slot></slot></span>
              <slot name="suffix"></slot>
            `}
      </button>
    `
  }
}

export interface WebUiButton {
  readonly $events: {
    click: MouseEvent
  }
}
