import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { normalizeNumber } from '@/shared/normalize'
import { findNearestTheme } from '@/shared/theme/theme-scope'

import style from './style.css?inline'

const GEOMETRY_SELECTOR = 'path, rect, circle, line, polyline, polygon, ellipse'

interface AnimationRun {
  animations: Animation[]
  restoreQueue: Map<SVGGeometryElement, { dasharray: string | null; dashoffset: string | null }>
  patchedD: Map<SVGGeometryElement, string>
}

@customElement('web-ui-svg-draw-lines')
export class WebUiSvgDrawLines extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Number, reflect: true })
  get duration(): number {
    return this._duration
  }
  set duration(v: number) {
    const old = this._duration
    this._duration = normalizeNumber(v, 0, 30000, 1000)
    this.requestUpdate('duration', old)
  }
  private _duration = 1000

  @property({ type: String, reflect: true }) easing = 'linear'

  private _activeRun: AnimationRun | undefined
  private _hasAutoPlayed = false
  /**
   * 停止当前播放并重新开始。每次调用重新收集子树中的几何元素。
   * 所有元素同时开始并行的 stroke-dashoffset 动画。
   * 无目标或当前主题范围启用 reduced motion 时立即 resolve。
   */
  async replay(): Promise<void> {
    this.cancelAll()

    if (this._isReducedMotion()) return

    const targets = this.collectGeometryElements()
    if (targets.length === 0) return

    const run: AnimationRun = {
      animations: [],
      restoreQueue: new Map(),
      patchedD: new Map()
    }
    this._activeRun = run

    await Promise.all(targets.map(el => this.animateElement(el, run)))

    // A later replay owns the current DOM state and must not be cleaned up here.
    if (this._activeRun === run) this.finishRun(run)
  }

  private cancelAll() {
    if (this._activeRun) this.finishRun(this._activeRun)
  }

  private _isReducedMotion(): boolean {
    const theme = findNearestTheme(this)
    if (theme) return theme.isReducedMotion()

    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }

  private finishRun(run: AnimationRun) {
    run.animations.forEach(anim => anim.cancel())

    // The animation temporarily mutates consumer-owned SVG nodes, so always restore them.
    for (const [el, cached] of run.restoreQueue) {
      el.style.strokeDasharray = cached.dasharray ?? ''
      el.style.strokeDashoffset = cached.dashoffset ?? ''
    }

    for (const [el, d] of run.patchedD) {
      el.setAttribute('d', d)
    }

    if (this._activeRun === run) this._activeRun = undefined
  }

  /**
   * 深度遍历组件的 light DOM 子节点与开放 Shadow Root，
   * 收集所有 SVGGeometryElement。closed shadow root 跳过。
   */
  private collectGeometryElements(): SVGGeometryElement[] {
    const elements: SVGGeometryElement[] = []
    const seen = new Set<SVGGeometryElement>()

    const walk = (root: Node) => {
      // Collect SVG geometry from this subtree
      if (root instanceof Element || root instanceof DocumentFragment) {
        root.querySelectorAll(GEOMETRY_SELECTOR).forEach(el => {
          // instanceof SVGGeometryElement 在 jsdom 中未定义，使用 duck-type 检查
          if (
            typeof (el as unknown as Record<string, unknown>).getTotalLength === 'function' &&
            !seen.has(el as unknown as SVGGeometryElement)
          ) {
            seen.add(el as unknown as SVGGeometryElement)
            elements.push(el as unknown as SVGGeometryElement)
          }
        })
      }

      // Recurse into children and open shadow roots
      if (root instanceof Element) {
        for (const child of root.children) walk(child)
        if (root.shadowRoot) walk(root.shadowRoot)
      } else if (root instanceof ShadowRoot) {
        for (const child of root.children) walk(child)
      }
    }

    for (const child of this.children) walk(child)
    return elements
  }

  private animateElement(el: SVGGeometryElement, run: AnimationRun): Promise<void> {
    return new Promise(resolve => {
      // Save inline styles once per animation cycle
      if (!run.restoreQueue.has(el)) {
        run.restoreQueue.set(el, {
          dasharray: el.style.strokeDasharray,
          dashoffset: el.style.strokeDashoffset
        })
      }

      // Gap fix for paths ending with Z/z
      if (el.tagName === 'path') {
        const d = el.getAttribute('d')
        if (d && /[Zz]\s*$/.test(d) && !run.patchedD.has(el)) {
          run.patchedD.set(el, d)
          el.setAttribute('d', this.fixPathGap(el, d))
        }
      }

      const strokeWidth = parseFloat(getComputedStyle(el).strokeWidth) || 0
      const len = el.getTotalLength() + strokeWidth

      el.style.strokeDasharray = `${len}`
      el.style.strokeDashoffset = `${len}`

      const anim = el.animate([{ strokeDashoffset: `${len}` }, { strokeDashoffset: '0' }], {
        duration: this.duration,
        easing: this.easing,
        fill: 'forwards'
      })

      run.animations.push(anim)

      anim.onfinish = () => {
        resolve()
      }

      anim.oncancel = () => {
        resolve()
      }
    })
  }

  // Z → explicit line back to start + 0.1px extra, forcing render of the closing segment
  private fixPathGap(pathEl: SVGPathElement, d: string): string {
    pathEl.setAttribute('d', d)
    const p0 = pathEl.getPointAtLength(0)
    const p1 = pathEl.getPointAtLength(0.1)
    return d.replace(/[Zz]\s*$/, `L${p0.x.toFixed(3)} ${p0.y.toFixed(3)} L${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`)
  }

  // 首次 slot 内容稳定后自动播放一次
  private handleSlotChange() {
    if (this._hasAutoPlayed) return
    this._hasAutoPlayed = true
    void this.replay()
  }

  override disconnectedCallback() {
    this.cancelAll()
    super.disconnectedCallback()
  }

  override render() {
    return html`<slot @slotchange=${this.handleSlotChange}></slot>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-svg-draw-lines': WebUiSvgDrawLines
  }
}
