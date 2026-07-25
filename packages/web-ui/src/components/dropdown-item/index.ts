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

  /** 通过可见元素聚焦，避免 portal 菜单跨 Shadow DOM 时丢失焦点。 */
  focusItem() {
    this.shadowRoot?.querySelector<HTMLElement>('.item-inner')?.focus()
  }

  override render() {
    const plStyle = this.pl ? `padding-left: ${this.pl}` : ''
    return html`
      <div class="item-inner" style=${plStyle} role="menuitem" tabindex=${this.disabled ? '-1' : '0'}>
        <slot name="prefix"></slot>
        <span class="item-label"><slot></slot></span>
        ${this.submenu
          ? html`<web-ui-icon .icon=${lucideChevronRight}></web-ui-icon>`
          : html`<span class="item-suffix"><slot name="suffix"></slot></span>`}
      </div>
    `
  }
}

export interface WebUiDropdownItem {
  readonly $events: Record<string, never>
  focusItem(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-item': WebUiDropdownItem
  }
}
