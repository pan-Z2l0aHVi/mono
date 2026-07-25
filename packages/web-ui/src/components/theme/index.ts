import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { applyOverlayRootStyles } from '@/shared/theme/overlay-root'

import style from './style.css?inline'

export type ThemeAppearance = 'light' | 'dark' | 'system'

const APPEARANCES = new Set<ThemeAppearance>(['light', 'dark', 'system'])

@customElement('web-ui-theme')
export class WebUiTheme extends LitElement {
  static override styles = unsafeCSS(style)

  /** 创建明确的浅色、深色或跟随系统的主题边界。 */
  @property({ type: String, reflect: true }) appearance?: ThemeAppearance

  private _warned = false

  override connectedCallback() {
    super.connectedCallback()
    this._warnWhenAppearanceIsMissing()
  }

  protected override updated() {
    this._warnWhenAppearanceIsMissing()
  }

  /** 返回此主题范围内的浮层挂载点；未设置 appearance 时不创建。 */
  getOverlayRoot(): HTMLElement | undefined {
    if (!this._hasAppearance()) return undefined
    return this.renderRoot.querySelector<HTMLElement>('[data-wui-overlay-container]') ?? undefined
  }

  override render() {
    return html`<slot></slot>${this._hasAppearance() ? html`<div data-wui-overlay-container></div>` : nothing}`
  }

  override firstUpdated() {
    if (this.renderRoot instanceof ShadowRoot) {
      applyOverlayRootStyles(this.renderRoot)
    }
  }

  private _hasAppearance(): this is this & { appearance: ThemeAppearance } {
    return this.appearance !== undefined && APPEARANCES.has(this.appearance)
  }

  private _warnWhenAppearanceIsMissing() {
    if (this._hasAppearance() || this._warned || !import.meta.env.DEV) return
    this._warned = true
    console.warn('[web-ui-theme] appearance is required; this theme scope is inactive until it is set.')
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-theme': WebUiTheme
  }
}
