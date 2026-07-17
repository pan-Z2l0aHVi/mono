import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import { lucideLoaderCircle } from '@/icons'

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
        ${this.loading ? html`<web-ui-icon .icon=${lucideLoaderCircle} spin></web-ui-icon>` : ''}
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

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button': WebUiButton
  }
}
