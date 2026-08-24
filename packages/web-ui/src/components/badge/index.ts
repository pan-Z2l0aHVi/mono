import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const
const MAX_SAFE = Number.MAX_SAFE_INTEGER

@customElement('web-ui-badge')
export class WebUiBadge extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Number, reflect: true })
  set count(value: number) {
    const normalized = normalizeNumber(value, 0, MAX_SAFE, 0)
    if (this._count !== normalized) {
      const old = this._count
      this._count = normalized
      this.requestUpdate('count', old)
    }
    if (this.getAttribute('count') !== String(normalized)) {
      this.setAttribute('count', String(normalized))
    }
  }

  get count(): number {
    return this._count
  }

  private _count = 0

  @property({ type: Number, reflect: true })
  set max(value: number) {
    const normalized = normalizeNumber(value, 0, MAX_SAFE, 99)
    if (this._max !== normalized) {
      const old = this._max
      this._max = normalized
      this.requestUpdate('max', old)
    }
    if (this.getAttribute('max') !== String(normalized)) {
      this.setAttribute('max', String(normalized))
    }
  }

  get max(): number {
    return this._max
  }

  private _max = 99

  @property({ type: Boolean, reflect: true }) dot = false
  @property({ type: Boolean, reflect: true, attribute: 'show-zero' }) showZero = false
  @property({ type: Boolean, reflect: true, attribute: 'badge-hidden' }) badgeHidden = false
  @property({ type: Number, reflect: true, attribute: 'offset-x' }) offsetX = 0
  @property({ type: Number, reflect: true, attribute: 'offset-y' }) offsetY = 0

  @property({ type: String, reflect: true })
  set placement(value: string) {
    const normalized = normalizeLiteral(value, ALLOWED_PLACEMENTS, 'top-right')
    if (this._placement !== normalized) {
      const old = this._placement
      this._placement = normalized
      this.requestUpdate('placement', old)
    }
    if (this.getAttribute('placement') !== normalized) {
      this.setAttribute('placement', normalized)
    }
  }

  get placement(): 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' {
    return this._placement
  }

  private _placement: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' = 'top-right'

  @state() private _hasContent = false

  private readonly _handleSlotChange = () => {
    this._hasContent = this.children.length > 0
  }

  override connectedCallback() {
    super.connectedCallback()
    this._hasContent = this.children.length > 0
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
        <slot @slotchange=${this._handleSlotChange}></slot>
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

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-badge': WebUiBadge
  }
}
