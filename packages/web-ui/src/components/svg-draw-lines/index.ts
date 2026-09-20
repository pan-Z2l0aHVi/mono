import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import { normalizeNumber } from '@/shared/normalize'
import { prefersReducedMotion } from '@/shared/theme/reduced-motion'

import style from './style.css?inline'

const GEOMETRY_SELECTOR = 'path, rect, circle, line, polyline, polygon, ellipse'

interface AnimationRun {
  reverse: boolean
  animations: Animation[]
  /** 本次运行写过的「空白」dash 值，按元素记；收回收尾要把它留在 DOM 上。 */
  blankByElement: Map<SVGGeometryElement, string>
  patchedD: Map<SVGGeometryElement, string>
}

export interface ReplayOptions {
  /** 沿原路径收回（从完整描边画回空白），默认 false 即揭示方向。 */
  reverse?: boolean
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

  /** 关掉「首次内容稳定时自动播放一次」，交给调用方用 replay() 决定何时播。 */
  @property({ type: Boolean, reflect: true, attribute: 'no-autoplay' }) noAutoplay = false

  private _activeRun: AnimationRun | undefined
  private _hasAutoPlayed = false
  /*
   * 消费者自己写在目标元素上的 dash 值，只在第一次碰到该元素时取一次。运行会把这两个属性改成
   * 自己的空白值，所以不能从「上一次运行之后」的状态重新取，否则画入收尾会把空白当成原值。
   */
  private readonly _authoredDash = new WeakMap<SVGGeometryElement, { dasharray: string; dashoffset: string }>()
  /** 收回留在元素上的「空白」，只有内联那两个值都还是我们自己写的那一份时才算数。 */
  private readonly _stickyBlank = new WeakMap<SVGGeometryElement, { dasharray: string; dashoffset: string }>()

  /**
   * 停止当前播放并重新开始。每次调用重新收集子树中的几何元素。
   * 所有元素同时开始并行的 stroke-dashoffset 动画。
   * options.reverse 为 true 时沿原路径收回。
   * 无目标或当前主题范围启用 reduced motion 时立即 resolve。
   */
  async replay(options: ReplayOptions = {}): Promise<void> {
    const reverse = options.reverse === true

    this.cancelAll()

    const targets = this.collectGeometryElements()

    if (prefersReducedMotion(this)) {
      // 不播，但上一次收回提交的空白要清掉：reduced motion 下可见性完全交给消费者的 opacity，
      // 留着空白就会出现「aria-checked=true 却看不见勾」，而之后每次 replay 都会同样早退、无法自愈。
      for (const el of targets) this.clearStickyBlank(el)
      return
    }

    if (targets.length === 0) return

    const run: AnimationRun = {
      reverse,
      animations: [],
      blankByElement: new Map(),
      patchedD: new Map()
    }
    this._activeRun = run

    await Promise.all(targets.map(el => this.animateElement(el, run, reverse)))

    // A later replay owns the current DOM state and must not be cleaned up here.
    if (this._activeRun !== run) return

    this.finishRun(run)
  }

  private cancelAll() {
    if (this._activeRun) this.finishRun(this._activeRun)
  }

  /*
   * 收尾分两个方向：画线还原消费者自己写的 dash（描边完整可见），收回把空白留在内联样式上
   * （整条路径落进 dash 间隙，看不见）。收回末态必须是 DOM 状态，不能是「一条还活着的
   * fill:forwards 动画」——元素被摘走再挂回（列表 key 重排、teleport）时，还原成完整描边的
   * 那份内联值会让勾当场复现，而控件已经是未勾选。
   */
  private finishRun(run: AnimationRun) {
    run.animations.forEach(anim => anim.cancel())

    for (const [el, d] of run.patchedD) {
      el.setAttribute('d', d)
    }

    for (const [el, blank] of run.blankByElement) {
      const authored = this._authoredDash.get(el)
      if (run.reverse) {
        el.style.strokeDasharray = blank
        el.style.strokeDashoffset = blank
        // 存回读值而不是写入值：CSSOM 会按自己的精度序列化，撤销时要按同一份文本比对。
        this._stickyBlank.set(el, { dasharray: el.style.strokeDasharray, dashoffset: el.style.strokeDashoffset })
      } else {
        el.style.strokeDasharray = authored?.dasharray ?? ''
        el.style.strokeDashoffset = authored?.dashoffset ?? ''
        this._stickyBlank.delete(el)
      }
    }

    if (this._activeRun === run) this._activeRun = undefined
  }

  /** 只撤销我们自己写进去的那一份空白；消费者后来动过内联的任一个值就不碰。 */
  private clearStickyBlank(el: SVGGeometryElement) {
    const blank = this._stickyBlank.get(el)
    if (
      blank === undefined ||
      el.style.strokeDasharray !== blank.dasharray ||
      el.style.strokeDashoffset !== blank.dashoffset
    )
      return

    const authored = this._authoredDash.get(el)
    el.style.strokeDasharray = authored?.dasharray ?? ''
    el.style.strokeDashoffset = authored?.dashoffset ?? ''
    this._stickyBlank.delete(el)
  }

  /**
   * 深度遍历组件的 light DOM 子节点与开放 Shadow Root，
   * 收集所有 SVGGeometryElement。closed shadow root 跳过。
   */
  private collectGeometryElements(): SVGGeometryElement[] {
    const elements: SVGGeometryElement[] = []
    const seen = new Set<SVGGeometryElement>()

    const walk = (root: Node) => {
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

  private animateElement(el: SVGGeometryElement, run: AnimationRun, reverse: boolean): Promise<void> {
    return new Promise(resolve => {
      if (!this._authoredDash.has(el)) {
        this._authoredDash.set(el, {
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
      // 空白 = 整条路径落在 dash 间隙里；满 = 偏移归零。两个方向只是这两端换先后。
      const blank = `${len}`
      const full = '0'
      const from = reverse ? full : blank
      const to = reverse ? blank : full

      el.style.strokeDasharray = blank
      el.style.strokeDashoffset = from
      run.blankByElement.set(el, blank)

      const anim = el.animate([{ strokeDashoffset: from }, { strokeDashoffset: to }], {
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

  // 首次 slot 内容稳定后自动播放一次；no-autoplay 下这一步交给调用方的 replay()。
  private handleSlotChange() {
    if (this.noAutoplay || this._hasAutoPlayed) return
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
