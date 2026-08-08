import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

// 注册 web-ui-icon（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideUser } from '@/icons'
import { normalizeLiteral } from '@/shared/normalize'

import style from './style.css?inline'

const ALLOWED_SHAPES = ['circle', 'square'] as const

@customElement('web-ui-avatar')
export class WebUiAvatar extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true })
  set src(value: string) {
    const old = this._src
    this._src = value
    if (old !== value) {
      this._imgError = false
      this.requestUpdate('src', old)
    }
  }

  get src(): string {
    return this._src
  }

  private _src = ''

  @property({ type: String, reflect: true }) alt = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Number, reflect: true }) size = 40

  @property({ type: String, reflect: true })
  set shape(value: string) {
    const normalized = normalizeLiteral(value, ALLOWED_SHAPES, 'circle')
    if (this._shape !== normalized) {
      const old = this._shape
      this._shape = normalized
      this.requestUpdate('shape', old)
    }
    // 外部 setAttribute 非法值后，宿主 attribute 与规范化后的值不同步，立即修正
    if (this.getAttribute('shape') !== normalized) {
      this.setAttribute('shape', normalized)
    }
  }

  get shape(): 'circle' | 'square' {
    return this._shape
  }

  private _shape: 'circle' | 'square' = 'circle'

  @state() private _imgError = false
  @state() private _hasDefaultSlot = false

  override connectedCallback() {
    super.connectedCallback()
    void this.updateComplete.then(() => {
      this.shadowRoot?.querySelector('slot:not([name])')?.addEventListener('slotchange', () => this._checkSlot())
    })
  }

  private _checkSlot() {
    const slot = this.shadowRoot?.querySelector('slot:not([name])')
    const has = slot instanceof HTMLSlotElement && slot.assignedElements().length > 0
    if (this._hasDefaultSlot !== has) {
      this._hasDefaultSlot = has
    }
  }

  private get _initials(): string {
    const words = this.name.trim().split(/\s+/)
    return words
      .slice(0, 2)
      .map(w => Array.from(w)[0])
      .join('')
      .toUpperCase()
  }

  private get _iconSize(): number {
    return Math.round(this.size * 0.4)
  }

  private get _showImage(): boolean {
    return !!this.src && !this._imgError
  }

  private get _showFallback(): boolean {
    return !this._showImage && !this._hasDefaultSlot
  }

  private _onImgError() {
    this._imgError = true
  }

  private get _ariaLabel(): string | undefined {
    if (this.alt) return this.alt
    if (this.name) return this.name
    return undefined
  }

  override render() {
    const isDecorative = !this._ariaLabel

    return html`
      <div
        class=${classMap({ 'avatar-inner': true, 'wui-glass': this._showFallback })}
        role=${isDecorative ? 'presentation' : 'img'}
        aria-label=${ifDefined(this._ariaLabel)}
        aria-hidden=${isDecorative ? 'true' : undefined}
        style="width:${this.size}px;height:${this.size}px;--wui-avatar-size:${this.size}px"
      >
        ${this._showImage
          ? html`<img
              class="avatar-img"
              src=${this.src}
              alt=${ifDefined(this.alt || undefined)}
              @error=${this._onImgError}
            />`
          : ''}
        <slot @slotchange=${this._checkSlot}></slot>
        ${this._showFallback && this._initials
          ? html`<span class="avatar-fallback avatar-initials">${this._initials}</span>`
          : ''}
        ${this._showFallback && !this._initials
          ? html`<span class="avatar-fallback"
              ><web-ui-icon .icon=${lucideUser} .size=${this._iconSize}></web-ui-icon
            ></span>`
          : ''}
      </div>
    `
  }

  declare readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-avatar': WebUiAvatar
  }
}
