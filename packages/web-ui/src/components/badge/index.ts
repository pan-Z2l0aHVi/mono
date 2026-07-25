import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'

import style from './style.css?inline'

@customElement('web-ui-badge')
export class WebUiBadge extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Number, reflect: true }) count = 0
  @property({ type: Number, reflect: true }) max = 99
  @property({ type: Boolean, reflect: true }) dot = false
  @property({ type: Boolean, reflect: true, attribute: 'show-zero' }) showZero = false
  @property({ type: Boolean, reflect: true, attribute: 'badge-hidden' }) badgeHidden = false
  @property({ type: Number, reflect: true, attribute: 'offset-x' }) offsetX = 0
  @property({ type: Number, reflect: true, attribute: 'offset-y' }) offsetY = 0
  @property({ type: String, reflect: true }) placement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' =
    'top-right'

  @state() private _hasContent = false

  override connectedCallback() {
    super.connectedCallback()
    this._hasContent = this.children.length > 0
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector('slot')?.addEventListener('slotchange', () => {
        this._hasContent = this.children.length > 0
      })
    })
  }

  override render() {
    const showBadge = this.badgeHidden ? false : this.dot ? true : this.count > 0 || this.showZero
    const display = this.dot ? '' : this.count > this.max ? `${this.max}+` : String(this.count)
    const ariaLabel = this.dot
      ? '未读'
      : this.count > 0
        ? `${this.count} 条未读消息`
        : this.showZero
          ? '无未读消息'
          : undefined
    const wrapperClass = { 'badge-wrapper': true, 'badge-wrapper-fixed': this._hasContent }
    const badgeClass = { badge: true, 'badge-dot': this.dot, 'badge-fixed': this._hasContent }
    const badgeStyle = {
      '--badge-offset-x': `${this.offsetX}px`,
      '--badge-offset-y': `${this.offsetY}px`
    }

    return html`
      <div class=${classMap(wrapperClass)}>
        <slot></slot>
        ${showBadge
          ? html`<span
              class=${classMap(badgeClass)}
              style=${styleMap(badgeStyle)}
              role="status"
              aria-label=${ifDefined(ariaLabel)}
              >${display}</span
            >`
          : ''}
      </div>
    `
  }
}

export interface WebUiBadge {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-badge': WebUiBadge
  }
}
