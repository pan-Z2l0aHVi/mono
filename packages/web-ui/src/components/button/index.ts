import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-button')
export class WebUiButton extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glass' = 'glass'
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) loading = false
  @property({ type: Boolean, reflect: true }) full = false
  @property({ type: Boolean, reflect: true }) icon = false
  @property({ type: String, reflect: true }) size = ''

  /** 解析 size="32" → 32x32，size="32x80" → 32x80 */
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

export interface WebUiButton {
  readonly $events: Record<string, never>
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-button': WebUiButton
  }
}
