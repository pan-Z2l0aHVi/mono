import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideInbox } from '@/icons'

import style from './style.css?inline'

export type EmptySize = 'small' | 'medium' | 'large'

@customElement('web-ui-empty')
export class WebUiEmpty extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  /** 空状态标题。默认 slot 有内容时，slot 内容优先。 */
  @property({ type: String, reflect: true }) override title = ''

  /** 空状态说明。description slot 有内容时，slot 内容优先。 */
  @property({ type: String, reflect: true }) description = ''

  @property({ type: String, reflect: true }) size: EmptySize = 'medium'

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
}

export interface WebUiEmpty {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-empty': WebUiEmpty
  }
}
