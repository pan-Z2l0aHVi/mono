import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { normalizeLiteral } from '@/shared/normalize'
import { applyOverlayRootStyles } from '@/shared/overlay/overlay-root'
import { parseDuration } from '@/shared/theme/duration'
import { registerThemeRootSync, unregisterThemeRootSync } from '@/shared/theme/root-sync'

import style from './style.css?inline'

export type ThemeAppearance = 'light' | 'dark' | 'system'
export type ThemeMotion = 'full' | 'reduced' | 'system'

const APPEARANCES = ['light', 'dark', 'system'] as const
const MOTIONS = ['full', 'reduced', 'system'] as const

interface ViewTransitionLike {
  readonly ready: Promise<void>
  readonly finished: Promise<void>
  skipTransition?: () => void
}

// 根主题没有对应控件；记录最近一次触发主题变更的指针位置，键盘或程序化调用则回退中心。
const transitionOrigin = { x: Number.NaN, y: Number.NaN }
let transitionSequence = 0
let transitionOriginCount = 0
let themeTransitionFlightToken: object | null = null
const recordTransitionOrigin = (event: Event) => {
  const pointer = event as PointerEvent
  transitionOrigin.x = pointer.clientX
  transitionOrigin.y = pointer.clientY
}
const forgetTransitionOrigin = () => {
  transitionOrigin.x = Number.NaN
  transitionOrigin.y = Number.NaN
}

function addTransitionOriginListeners() {
  if (transitionOriginCount++ > 0) return
  window.addEventListener('pointerdown', recordTransitionOrigin, true)
  window.addEventListener('keydown', forgetTransitionOrigin, true)
}

function removeTransitionOriginListeners() {
  if (--transitionOriginCount > 0) return
  window.removeEventListener('pointerdown', recordTransitionOrigin, true)
  window.removeEventListener('keydown', forgetTransitionOrigin, true)
}

function resolveAppearance(appearance: ThemeAppearance): 'light' | 'dark' {
  if (appearance !== 'system') return appearance
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function transitionPoint(x: number, y: number): { x: number; y: number } {
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y }
  return {
    x: (window.innerWidth || 0) / 2,
    y: (window.innerHeight || 0) / 2
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
    const request = ++this._appearanceRequest
    if (
      next !== undefined &&
      !this._transitionRequested &&
      themeTransitionFlightToken === null &&
      this._shouldAnimateAppearance(next)
    ) {
      // async helper 可能把函数体排到当前栈后；flight gate 必须在当前 setter 栈内生效。
      this._transitionRequested = true
      const flightToken = { requestId: request }
      themeTransitionFlightToken = flightToken
      void this._startThemeTransition(next, old!, request, flightToken).catch(() => {
        this._cleanupThemeTransition()
        this._transitionRequested = false
        if (themeTransitionFlightToken === flightToken) themeTransitionFlightToken = null
        if (this._appearanceRequest === request) {
          this._appearance = next
          this.requestUpdate('appearance', old)
        }
      })
      return
    }
    this._appearance = next
    this.requestUpdate('appearance', old)
  }
  private _appearance?: ThemeAppearance
  private _appearanceRequest = 0

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
  private _transitionRequested = false

  private _warned = false

  override connectedCallback() {
    super.connectedCallback()
    // 揭示开关曾由 transition prop 单独控制；现在统一由 motion 决定，
    // 因此连接期间始终记录圆心来源，真正是否动画仍看 _shouldAnimateAppearance。
    this._syncTransitionOriginListeners(true)
    this._syncRootPageColorSync()
    this._warnWhenAppearanceIsMissing()
  }

  override disconnectedCallback() {
    this._syncTransitionOriginListeners(false)
    unregisterThemeRootSync(this)
    this._activeTransition?.skipTransition?.()
    this._cleanupThemeTransition()
    super.disconnectedCallback()
  }

  protected override updated() {
    this._warnWhenAppearanceIsMissing()
    this._syncRootPageColorSync()
  }

  /*
   * root page 色同步的登记态：只有 active（有 appearance）的主题参与，
   * appearance 被清掉时撤销登记、把同步权顺延给下一个已连接实例。
   * updated() 里重复登记是幂等的，因此这里同时承担「appearance 变化后刷新 root 值」。
   */
  private _syncRootPageColorSync() {
    if (this._hasAppearance()) registerThemeRootSync(this)
    else unregisterThemeRootSync(this)
  }

  // 返回该主题拥有的浮层挂载点；未设置 appearance 时不创建。
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

  private _transitionOrigin(): { x: number; y: number } {
    if (Number.isFinite(transitionOrigin.x) && Number.isFinite(transitionOrigin.y)) {
      return transitionOrigin
    }

    const box = this.getBoundingClientRect()
    if (box.width > 0 && box.height > 0) {
      return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    }
    return transitionPoint(Number.NaN, Number.NaN)
  }

  private _syncTransitionOriginListeners(listening: boolean) {
    if (listening === this._transitionOriginListening) return
    this._transitionOriginListening = listening
    if (listening) addTransitionOriginListeners()
    else removeTransitionOriginListeners()
  }

  private _transitionMotion(): { duration: number; easing: string } {
    const style = getComputedStyle(this)
    const duration = parseDuration(style.getPropertyValue('--wui-theme-transition-duration')) ?? 500
    const easing = style.getPropertyValue('--wui-theme-transition-easing').trim() || 'ease-in'
    const safeEasing = globalThis.CSS?.supports('animation-timing-function', easing) ? easing : 'ease-in'
    return { duration: Math.max(0, duration), easing: safeEasing }
  }

  private _shouldAnimateAppearance(next: ThemeAppearance): boolean {
    const previous = this._appearance
    if (!previous || previous === next) return false
    if (resolveAppearance(previous) === resolveAppearance(next)) return false
    return (
      typeof document.startViewTransition === 'function' &&
      Array.isArray(document.adoptedStyleSheets) &&
      !this.isReducedMotion() &&
      this._transitionMotion().duration > 0
    )
  }

  // 嵌套主题只做局部揭示；View Transitions 需要 capture box，因此飞行期间临时生成一个 host box。
  private async _startThemeTransition(
    next: ThemeAppearance,
    previous: ThemeAppearance,
    request: number,
    flightToken: object
  ): Promise<void> {
    const root = this._findThemeAncestor() === null
    const transitionName = root ? undefined : `wui-theme-transition-${++transitionSequence}`
    const styleSheet = new CSSStyleSheet()
    if (transitionName) {
      styleSheet.replaceSync(`
        ::view-transition-old(root), ::view-transition-new(root) { animation: none; }
        ::view-transition-old(root), ::view-transition-new(root) { mix-blend-mode: normal; }
        ::view-transition-image-pair(root), ::view-transition-image-pair(${transitionName}) { mix-blend-mode: normal; }
        ::view-transition-group(${transitionName}) { animation: none; }
        ::view-transition-old(${transitionName}), ::view-transition-new(${transitionName}) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-old(${transitionName}) { z-index: ${next === 'dark' ? 1 : 2}; }
        ::view-transition-new(${transitionName}) { z-index: ${next === 'dark' ? 2 : 1}; }
      `)
    } else {
      styleSheet.replaceSync(`
        ::view-transition-old(root), ::view-transition-new(root) {
          animation: none;
          mix-blend-mode: normal;
        }
        ::view-transition-image-pair(root) { mix-blend-mode: normal; }
        ::view-transition-old(root) { z-index: ${next === 'dark' ? 1 : 2}; }
        ::view-transition-new(root) { z-index: ${next === 'dark' ? 2 : 1}; }
      `)
    }

    const hadDisplay = this.style.getPropertyValue('display')
    const hadTransitionName = transitionName ? this.style.getPropertyValue('view-transition-name') : undefined
    if (transitionName) {
      this.style.setProperty('display', 'block')
      this.style.setProperty('view-transition-name', transitionName)
    }

    const restoreCapture = () => {
      try {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(sheet => sheet !== styleSheet)
      } catch {
        // 拒绝写入的 setter 也拒绝回收，样式表本就没进去；host 内联态的恢复不能因此中断。
      }
      if (!transitionName) return
      if (hadTransitionName) this.style.setProperty('view-transition-name', hadTransitionName)
      else this.style.removeProperty('view-transition-name')
      if (hadDisplay) this.style.setProperty('display', hadDisplay)
      else this.style.removeProperty('display')
    }

    const commit = () => {
      if (this._appearanceRequest !== request) return this.updateComplete
      this._appearance = next
      this.requestUpdate('appearance', previous)
      return this.updateComplete
    }
    // cleanup 必须在 adoptedStyleSheets 写入之前登记：写入同步抛错时 setter 的 .catch 才拿得到它，
    // 否则 host 上的 view-transition-name 会残留，污染之后每一次 view transition（issue #146）。
    this._transitionCleanup = restoreCapture
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, styleSheet]
    const transition = document.startViewTransition(commit) as unknown as ViewTransitionLike
    this._activeTransition = transition
    const animations: Animation[] = []

    transition.ready
      .then(() => {
        const { duration, easing } = this._transitionMotion()
        if (duration <= 0) return
        const { x, y } = this._transitionOrigin()
        const target = next === 'dark' ? '::view-transition-new(root)' : '::view-transition-old(root)'
        if (!root) {
          const box = this.getBoundingClientRect()
          const relative = { x: x - box.left, y: y - box.top }
          const radius = Math.ceil(
            Math.hypot(Math.max(relative.x, box.width - relative.x), Math.max(relative.y, box.height - relative.y))
          )
          const frames = this._transitionKeyframes(relative.x, relative.y, radius, next)
          const target =
            next === 'dark' ? `::view-transition-new(${transitionName})` : `::view-transition-old(${transitionName})`
          animations.push(
            document.documentElement.animate(frames, {
              duration,
              easing,
              fill: 'both',
              pseudoElement: target
            } as KeyframeAnimationOptions)
          )
          return
        }

        const radius = Math.ceil(Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)))
        animations.push(
          document.documentElement.animate(this._transitionKeyframes(x, y, radius, next), {
            duration,
            easing,
            fill: 'both',
            pseudoElement: target
          } as KeyframeAnimationOptions)
        )
      })
      .catch(() => undefined)

    try {
      await transition.finished
    } catch {
      // API 缺失、capture 冲突或用户 skip 都不是状态错误；appearance 已由 update callback 提交。
    } finally {
      this._activeTransition = undefined
      this._transitionCleanup = undefined
      for (const animation of animations) animation.cancel()
      restoreCapture()
      // disconnected skip 会提前清掉 active；flight token/request 必须无条件释放。
      this._transitionRequested = false
      if (themeTransitionFlightToken === flightToken) themeTransitionFlightToken = null
    }
  }

  private _transitionKeyframes(x: number, y: number, radius: number, next: ThemeAppearance): Keyframe[] {
    const from = `circle(0px at ${x}px ${y}px)`
    const to = `circle(${radius}px at ${x}px ${y}px)`
    return next === 'dark' ? [{ clipPath: from }, { clipPath: to }] : [{ clipPath: to }, { clipPath: from }]
  }

  private _cleanupThemeTransition(restoreCapture = true) {
    this._activeTransition = undefined
    const cleanup = this._transitionCleanup
    this._transitionCleanup = undefined
    if (restoreCapture) cleanup?.()
  }

  private _activeTransition?: ViewTransitionLike
  private _transitionCleanup?: () => void

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
