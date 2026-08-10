import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'
import { styleMap } from 'lit/directives/style-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'
import { normalizeLiteral } from '@/shared/normalize'

import style from './style.css?inline'

const ALLOWED_VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'glass'] as const
const ALLOWED_TYPES = ['button', 'submit', 'reset'] as const

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true })
  get variant(): 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' {
    return this._variant
  }
  set variant(v: string) {
    const old = this._variant
    this._variant = normalizeLiteral(v, ALLOWED_VARIANTS, 'glass')
    this.requestUpdate('variant', old)
  }
  private _variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' = 'glass'

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) loading = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) icon = false
  @property({ type: String, reflect: true }) size = ''

  @property({ type: String, reflect: true })
  get type(): (typeof ALLOWED_TYPES)[number] {
    return this._type
  }
  set type(value: unknown) {
    const old = this._type
    this._type = normalizeLiteral(value, ALLOWED_TYPES, 'button')
    this.requestUpdate('type', old)
  }
  private _type: (typeof ALLOWED_TYPES)[number] = 'button'

  // Explicitly delegated accessible naming attributes.
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  // size="32" → 32x32，size="32x80" → 32x80
  private get _sizeStyle(): Record<string, string> {
    if (!this.size) return {}
    const [h, w] = this.size.split('x')
    const style: Record<string, string> = { '--wui-button-size': `${h}px` }
    if (w) style['--wui-button-width'] = `${w}px`
    return style
  }

  private handleClick(e: Event) {
    if (this.disabled || this.loading) {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  override render() {
    const btnClass = { 'wui-glass': this.variant === 'glass' && !this.hasAttribute('group') }
    return html`
      <button
        type=${this.type}
        aria-label=${ifDefined(this.ariaLabel)}
        class=${classMap(btnClass)}
        style=${this.size ? styleMap(this._sizeStyle) : nothing}
        ?disabled=${this.disabled || this.loading}
        @click=${this.handleClick}
      >
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

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button': WebUiButton
  }
}
