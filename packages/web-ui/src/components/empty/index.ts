import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideInbox } from '@/icons'
import { normalizeLiteral } from '@/shared/normalize'

import style from './style.css?inline'

export type EmptySize = 'small' | 'medium' | 'large'

const ALLOWED_SIZES = ['small', 'medium', 'large'] as const

@customElement('web-ui-empty')
export class WebUiEmpty extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) override title = ''

  @property({ type: String, reflect: true }) description = ''

  @property({ type: String, reflect: true })
  set size(value: string) {
    const normalized = normalizeLiteral(value, ALLOWED_SIZES, 'medium')
    if (this._size !== normalized) {
      const old = this._size
      this._size = normalized
      this.requestUpdate('size', old)
    }
    if (this.getAttribute('size') !== normalized) {
      this.setAttribute('size', normalized)
    }
  }

  get size(): EmptySize {
    return this._size
  }

  private _size: EmptySize = 'medium'

  @state() private _hasTitleSlot = false
  @state() private _hasDescriptionSlot = false
  @state() private _hasActionSlot = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncSlotContent()
  }

  private _syncSlotContent = () => {
    this._hasTitleSlot = this._hasAssignedContent()
    this._hasDescriptionSlot = this._hasAssignedContent('description')
    this._hasActionSlot = this._hasAssignedContent('action')
  }

  private _hasAssignedContent(slotName?: string): boolean {
    return [...this.childNodes].some(node => {
      if (node instanceof HTMLElement && (node.getAttribute('slot') ?? '') === (slotName ?? '')) return true
      return !slotName && node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim())
    })
  }

  override render() {
    const showTitle = this._hasTitleSlot || Boolean(this.title)
    const showDescription = this._hasDescriptionSlot || Boolean(this.description)

    return html`
      <section class="empty">
        <div class="empty-icon wui-glass" aria-hidden="true">
          <slot name="icon"><web-ui-icon .icon=${lucideInbox}></web-ui-icon></slot>
        </div>
        <div class=${classMap({ 'empty-title': true, 'is-hidden': !showTitle })}>
          <slot @slotchange=${this._syncSlotContent}>${this.title}</slot>
        </div>
        <div class=${classMap({ 'empty-description': true, 'is-hidden': !showDescription })}>
          <slot name="description" @slotchange=${this._syncSlotContent}>${this.description}</slot>
        </div>
        <div class=${classMap({ 'empty-action': true, 'is-hidden': !this._hasActionSlot })}>
          <slot name="action" @slotchange=${this._syncSlotContent}></slot>
        </div>
      </section>
    `
  }

  declare readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-empty': WebUiEmpty
  }
}
