import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { normalizeLiteral } from '@/shared/normalize'
import { applyOverlayRootStyles } from '@/shared/theme/overlay-root'

import style from './style.css?inline'

export type ThemeAppearance = 'light' | 'dark' | 'system'
export type ThemeMotion = 'full' | 'reduced' | 'system'

const APPEARANCES = ['light', 'dark', 'system'] as const
const MOTIONS = ['full', 'reduced', 'system'] as const

@customElement('web-ui-theme')
export class WebUiTheme extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String, reflect: true })
  get appearance(): ThemeAppearance | undefined {
    return this._appearance
  }
  set appearance(v: string | undefined) {
    const old = this._appearance
    this._appearance = v !== undefined ? (normalizeLiteral(v, APPEARANCES, 'light') as ThemeAppearance) : undefined
    this.requestUpdate('appearance', old)
  }
  private _appearance?: ThemeAppearance

  @property({ type: String, reflect: true })
  get motion(): ThemeMotion {
    return this._motion
  }
  set motion(v: string) {
    const old = this._motion
    this._motion = normalizeLiteral(v, MOTIONS, 'system') as ThemeMotion
    this.requestUpdate('motion', old)
  }
  private _motion: ThemeMotion = 'system'

  private _warned = false

  override connectedCallback() {
    super.connectedCallback()
    this._warnWhenAppearanceIsMissing()
  }

  protected override updated() {
    this._warnWhenAppearanceIsMissing()
  }

  // 返回此主题范围内的浮层挂载点；未设置 appearance 时不创建。
  getOverlayRoot(): HTMLElement | undefined {
    if (!this._hasAppearance()) return undefined
    return this.renderRoot.querySelector<HTMLElement>('[data-wui-overlay-container]') ?? undefined
  }

  // 当前范围是否应减少动效；`system` 跟随用户的系统偏好。
  isReducedMotion(): boolean {
    if (this.motion === 'reduced') return true
    if (this.motion === 'full') return false

    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
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
    return this.appearance !== undefined && (APPEARANCES as readonly string[]).includes(this.appearance)
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
