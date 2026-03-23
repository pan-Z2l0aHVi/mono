import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, query, state } from 'lit/decorators.js'

import style from './style.css?inline'

@customElement('web-ui-svg-draw-lines')
export class WebUiSvgDrawLines extends LitElement {
  static styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) duration = 1000
  @property({ type: String, reflect: true }) easing = 'linear'

  @state() private isAnimating = false
  @state() private svgClone: SVGSVGElement | null = null
  @query('slot') private slotEl!: HTMLSlotElement

  private handleSlotChange() {
    if (this.isAnimating) return

    this.cloneOriginalSvg()

    this.isAnimating = true
    this.startAnimation()
  }

  private cloneOriginalSvg() {
    const original = this.slotEl.assignedElements({ flatten: true })[0]
    if (!(original instanceof SVGSVGElement)) return

    const svgClone = original.cloneNode(true) as SVGSVGElement
    svgClone.classList.add('svg-clone')
    this.svgClone = svgClone
  }

  private async startAnimation() {
    if (!this.svgClone) return
    await this.updateComplete

    const selectors = 'path, rect, circle, line, polyline, polygon, ellipse'
    const elements = Array.from(this.svgClone.querySelectorAll(selectors)) as SVGGeometryElement[]

    const animTasks: SVGGeometryElement[] = []
    let cursor = { x: 0, y: 0 }

    // 除 path 外其余几何图形无需额外处理
    // 将绘制多段路径的单 path 先拆分为多 path 并重新插入 dom
    // 再分别计算每个 path 的 total length
    elements.forEach(el => {
      if (el instanceof SVGPathElement) {
        const d = el.getAttribute('d') || ''
        const segments = d.split(/(?=[Mm])/).filter(s => s.trim())

        // 无论是一段还是多段，统一处理
        segments.forEach(seg => {
          const pathPart = segments.length > 1 ? (el.cloneNode() as SVGPathElement) : el
          let finalD = seg.startsWith('m') ? `M${cursor.x} ${cursor.y}${seg}` : seg

          finalD = this.fixPathGap(pathPart, finalD)
          pathPart.setAttribute('d', finalD)

          if (segments.length > 1) el.parentNode?.insertBefore(pathPart, el)

          animTasks.push(pathPart)

          const end = pathPart.getPointAtLength(pathPart.getTotalLength())
          cursor = { x: end.x, y: end.y }
        })

        if (segments.length > 1) el.remove()
      } else {
        animTasks.push(el)
      }
    })

    if (animTasks.length === 0) return this.stopAnimation()

    const promises = animTasks.map((el, i) => {
      return new Promise<void>(resolve => {
        this.drawLine(el, i, resolve)
      })
    })

    await Promise.all(promises)
    this.stopAnimation()
  }

  // 缺口修复逻辑
  // 多走 0.1px 触发渲染闭合和确定起始矢量方向
  private fixPathGap(pathEl: SVGPathElement, d: string): string {
    if (/[Zz]\s*$/.test(d)) {
      pathEl.setAttribute('d', d)
      const p0 = pathEl.getPointAtLength(0)
      const p1 = pathEl.getPointAtLength(0.1)

      // 将 Z 替换为回到起点并多走 0.1px 的路径
      return d.replace(/[Zz]\s*$/, `L${p0.x.toFixed(3)} ${p0.y.toFixed(3)} L${p1.x.toFixed(3)} ${p1.y.toFixed(3)}`)
    }
    return d
  }

  private drawLine(el: SVGGeometryElement, index: number, onFinish: () => void) {
    const strokeWidth = parseFloat(getComputedStyle(el).strokeWidth) || 0
    const len = el.getTotalLength() + strokeWidth

    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`

    const anim = el.animate([{ strokeDashoffset: `${len}` }, { strokeDashoffset: '0' }], {
      duration: this.duration,
      easing: this.easing,
      fill: 'forwards'
    })
    anim.onfinish = onFinish
  }

  private stopAnimation() {
    this.isAnimating = false
    this.svgClone = null
  }

  render() {
    return html`
      <slot ?hidden="${this.isAnimating}" @slotchange="${this.handleSlotChange}"></slot>
      ${this.isAnimating ? this.svgClone : ''}
    `
  }
}
