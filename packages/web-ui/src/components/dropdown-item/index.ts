import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import { lucideChevronRight } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-dropdown-item')
export class WebUiDropdownItem extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: String, reflect: true }) pl = ''
  @property({ type: String, reflect: true }) value = ''
  @property({ type: Boolean, reflect: true }) submenu = false

  override render() {
    const plStyle = this.pl ? `padding-left: ${this.pl}` : ''
    return html`
      <div class="item-inner" style=${plStyle} role="menuitem" tabindex=${this.disabled ? '-1' : '0'}>
        <slot name="prefix"></slot>
        <span class="item-label"><slot></slot></span>
        ${this.submenu
          ? html`<web-ui-icon .icon=${lucideChevronRight}></web-ui-icon>`
          : html`<slot name="suffix"></slot>`}
      </div>
    `
  }
}

export interface WebUiDropdownItem {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-item': WebUiDropdownItem
  }
}
