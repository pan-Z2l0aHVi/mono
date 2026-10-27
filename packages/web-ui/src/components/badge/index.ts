import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/classes/glass.css?inline'
import { formatBuiltinLabel, resolveBuiltinLabel } from '@/shared/locale/builtin-labels'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['top-right', 'top-left', 'bottom-right', 'bottom-left'] as const
const MAX_SAFE = Number.MAX_SAFE_INTEGER

function hasDefaultSlotContent(nodes: Iterable<Node>): boolean {
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) return true
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).slot === '') return true
  }
  return false
}

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

  /**
   * 徽标 status 的无障碍名称；设置后点/计数/零三种状态都用它（支持 `{count}` 占位）。
   * 未设置时回退内置英文文案（见 ADR-0029）。
   */
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

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

  private readonly _contentObserver = new MutationObserver(() => this._syncHasContent())

  private readonly _handleSlotChange = () => {
    this._syncHasContent()
  }

  private _syncHasContent(): void {
    const slot = this.renderRoot.querySelector('slot')
    this._hasContent = hasDefaultSlotContent(slot?.assignedNodes() ?? this.childNodes)
  }

  override connectedCallback() {
    super.connectedCallback()
    this._syncHasContent()
    this._contentObserver.observe(this, { characterData: true, subtree: true })
  }

  override disconnectedCallback() {
    this._contentObserver.disconnect()
    super.disconnectedCallback()
  }

  override render() {
    const showBadge = this.badgeHidden ? false : this.dot ? true : this.count > 0 || this.showZero
    const display = this.dot ? '' : this.count > this.max ? `${this.max}+` : String(this.count)
    const fallback = this.dot
      ? resolveBuiltinLabel('unread')
      : this.count > 0
        ? resolveBuiltinLabel('unreadCount')
        : this.showZero
          ? resolveBuiltinLabel('noUnread')
          : undefined
    const raw = this.ariaLabel?.trim() || fallback
    const ariaLabel = raw === undefined ? undefined : formatBuiltinLabel(raw, { count: this.count })
    const wrapperClass = { 'badge-wrapper': true, 'badge-wrapper-fixed': this._hasContent }
    const badgeClass = { badge: true, 'badge-dot': this.dot, 'badge-fixed': this._hasContent }
    const badgeStyle = {
      '--badge-offset-x': `${this.offsetX}px`,
      '--badge-offset-y': `${this.offsetY}px`
    }

    return html`
      <div class=${classMap(wrapperClass)}>
        <slot @slotchange=${this._handleSlotChange}></slot>
        ${
          showBadge
            ? html`<span
                class=${classMap(badgeClass)}
                style=${styleMap(badgeStyle)}
                role="status"
                aria-label=${ifDefined(ariaLabel)}
                >${display}</span
              >`
            : ''
        }
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-badge': WebUiBadge
  }
}
