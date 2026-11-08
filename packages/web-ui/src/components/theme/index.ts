import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { normalizeLiteral } from '@/shared/normalize'
import { applyOverlayRootStyles } from '@/shared/overlay/overlay-root'
import {
  registerThemeRootSync,
  subscribeThemeSystemAppearanceChange,
  unregisterThemeRootSync
} from '@/shared/theme/root-sync'
import {
  isThemeTransitionInFlight,
  runThemeTransition,
  themeTransitionMotion,
  trackThemeTransitionOrigin,
  untrackThemeTransitionOrigin,
  type ResolvedThemeAppearance,
  type ThemeTransitionSession
} from '@/shared/theme/transition'

import style from './style.css?inline'

export type ThemeAppearance = 'light' | 'dark' | 'system'
export type { ResolvedThemeAppearance }
export type ThemeMotion = 'full' | 'reduced' | 'system'

const APPEARANCES = ['light', 'dark', 'system'] as const
const MOTIONS = ['full', 'reduced', 'system'] as const

function resolveAppearance(appearance: ThemeAppearance | undefined): ResolvedThemeAppearance {
  if (appearance === 'dark') return 'dark'
  if (appearance !== 'system') return 'light'
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

@customElement('web-ui-theme')
export class WebUiTheme extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String, reflect: true })
  get appearance(): ThemeAppearance | undefined {
    return this._appearance
  }
  set appearance(v: string | undefined) {
    const old = this._appearance
    const next = v !== undefined ? (normalizeLiteral(v, APPEARANCES, 'light') as ThemeAppearance) : undefined
    const resolvedNext = resolveAppearance(next)
    const request = ++this._appearanceRequest
    /*
     * flight gate 单点在引擎（document 级单飞）：原「!this._transitionRequested &&
     * themeTransitionFlightToken === null」两闸与引擎 token 同点置位 / 释放，单独的全局
     * 在飞判定与之等价。token 的认领在 runThemeTransition 的同步段完成——async helper
     * 可能把函数体排到当前栈后，gate 必须在当前 setter 栈内生效。
     */
    if (next !== undefined && !isThemeTransitionInFlight() && this._shouldAnimateAppearance(next, resolvedNext)) {
      const session = runThemeTransition({
        host: this,
        // 嵌套主题只做局部揭示；根主题 scope 缺省（整页揭示）。
        scope: this._findThemeAncestor() === null ? undefined : this,
        resolvedNext,
        update: () => this._commitAppearance(next, old!, request)
      })
      this._transitionSession = session
      void session.finished.catch(() => {
        // 原 setter .catch 的组件侧：失败回退仍要提交最终 appearance（引擎侧的清理链与
        // flight token 释放已在 reject 之前跑完）。stale 请求守卫在提交闭包内，复用同一份。
        void this._commitAppearance(next, old!, request)
      })
      return
    }
    this._appearance = next
    this._syncResolvedAppearance()
    this.requestUpdate('appearance', old)
  }
  private _appearance?: ThemeAppearance
  private _appearanceRequest = 0

  /**
   * appearance 提交闭包：View Transition 的 update callback 与失败回退共用。
   * stale 请求守卫（飞行期间的新 setter 走「直接落地」分支并推进请求序号，
   * 在途 commit 因此作废）与渲染收敛都在 property 管线这一侧。
   */
  private _commitAppearance(
    next: ThemeAppearance,
    previous: ThemeAppearance | undefined,
    request: number
  ): Promise<unknown> {
    if (this._appearanceRequest !== request) return this.updateComplete
    this._appearance = next
    this._syncResolvedAppearance()
    this.requestUpdate('appearance', previous)
    return this.updateComplete
  }

  /*
   * resolved-appearance 是派生输出，不是第二个输入：像 selected-value 一样由组件独占写入，
   * 外部改动在同一 attribute reaction 内恢复，避免消费者把 system 的解析结果当成可设状态。
   */
  @property({ type: String, reflect: true, attribute: 'resolved-appearance' })
  private _resolvedAppearance: ResolvedThemeAppearance = 'light'

  get resolvedAppearance(): ResolvedThemeAppearance {
    return this._resolvedAppearance
  }

  private _setResolvedAppearance(value: ResolvedThemeAppearance) {
    const old = this._resolvedAppearance
    if (old === value && this.getAttribute('resolved-appearance') === value) return
    this._resolvedAppearance = value
    // 立即写 attribute：View Transition 的 update callback 要在同一次快照里换掉它。
    this.setAttribute('resolved-appearance', value)
  }

  private _syncResolvedAppearance() {
    this._setResolvedAppearance(resolveAppearance(this._appearance))
    this._syncSystemAppearanceSubscription()
  }

  private _syncSystemAppearanceSubscription() {
    const shouldSubscribe = this.isConnected && this._hasAppearance() && this._appearance === 'system'
    if (shouldSubscribe) {
      if (this._unsubscribeSystemAppearance) return
      this._unsubscribeSystemAppearance = subscribeThemeSystemAppearanceChange(() => {
        this._setResolvedAppearance(resolveAppearance(this._appearance))
      })
      return
    }
    this._unsubscribeSystemAppearance?.()
    this._unsubscribeSystemAppearance = undefined
  }
  private _unsubscribeSystemAppearance?: () => void

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

  private _transitionOriginListening = false
  /** 当前在途转场的 session（skip / 收尾信号）；无飞行时为 undefined。 */
  private _transitionSession?: ThemeTransitionSession

  private _warned = false

  override connectedCallback() {
    super.connectedCallback()
    this._syncResolvedAppearance()
    // 是否动画统一由 motion 决定，因此连接期间始终记录圆心来源，真正是否动画仍看
    // _shouldAnimateAppearance。
    this._syncTransitionOriginListeners(true)
    this._syncRootTokens()
    this._warnWhenAppearanceIsMissing()
  }

  override disconnectedCallback() {
    this._syncTransitionOriginListeners(false)
    this._unsubscribeSystemAppearance?.()
    this._unsubscribeSystemAppearance = undefined
    unregisterThemeRootSync(this)
    this._transitionSession?.skip()
    this._transitionSession = undefined
    super.disconnectedCallback()
  }

  protected override updated() {
    this._warnWhenAppearanceIsMissing()
    this._syncRootTokens()
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    super.attributeChangedCallback(name, oldValue, newValue)
    // super 已把外部值写进 backing field，所以这里必须按 appearance 重算，不能与字段比较。
    if (name === 'resolved-appearance') this._setResolvedAppearance(resolveAppearance(this._appearance))
  }

  /*
   * root token 同步的登记态：只有 active（有 appearance）的主题参与，
   * appearance 被清掉时撤销登记、把同步权顺延给下一个已连接实例。
   * updated() 里重复登记是幂等的，因此这里同时承担「appearance 变化后刷新 root 值」。
   */
  private _syncRootTokens() {
    if (this._hasAppearance()) registerThemeRootSync(this)
    else unregisterThemeRootSync(this)
  }

  // 返回该主题拥有的 overlay 挂载点；未设置 appearance 时不创建。
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

  private _findThemeAncestor(): WebUiTheme | null {
    let node = this.parentNode
    while (node) {
      if (node instanceof WebUiTheme && node !== this && node._hasAppearance()) return node
      if (node instanceof ShadowRoot) {
        node = node.host
      } else {
        node = node.parentElement
      }
    }
    return null
  }

  private _syncTransitionOriginListeners(listening: boolean) {
    if (listening === this._transitionOriginListening) return
    this._transitionOriginListening = listening
    if (listening) trackThemeTransitionOrigin()
    else untrackThemeTransitionOrigin()
  }

  private _shouldAnimateAppearance(next: ThemeAppearance, resolvedNext: ResolvedThemeAppearance): boolean {
    const previous = this._appearance
    if (!previous || previous === next) return false
    if (resolveAppearance(previous) === resolvedNext) return false
    return (
      typeof document.startViewTransition === 'function' &&
      Array.isArray(document.adoptedStyleSheets) &&
      !this.isReducedMotion() &&
      themeTransitionMotion(this).duration > 0
    )
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
