import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import type { CollapseContentContext } from '@/components/collapse'
import { defineGroupManaged } from '@/shared/group-management'
import { getTransitionDuration } from '@/shared/overlay/presence'

import style from './style.css?inline'

const EXIT_FALLBACK_BUFFER = 80

let collapseContentIdCounter = 0

/**
 * 折叠内容区：grid 0fr↔1fr 过渡驱动高度/宽度动画（ADR-0038）。
 *
 * 关闭稳态三态（消费者 light DOM 永不移动）：
 * - 默认：宿主 `hidden`（display:none，脱离渲染与可访问性树）；
 * - `keep-mounted`：内部 `inert`（保留在 0fr 轨道内，滚动位置与布局可测量）；
 * - 动画进行中：仅阻断交互（inert + pointer-events），结束后进入对应稳态。
 */
@customElement('web-ui-collapse-content')
export class WebUiCollapseContent extends LitElement {
  static override styles = unsafeCSS(style)

  /** 关闭稳态保持内部 `inert` 而非宿主 `hidden`（保留滚动位置，可测量）。 */
  @property({ type: Boolean, reflect: true, attribute: 'keep-mounted' }) keepMounted = false

  private readonly _collapseManaged = defineGroupManaged<CollapseContentContext>(this, {
    requestUpdate: () => this.requestUpdate(),
    equals: (a, b) => a?.open === b?.open && a?.horizontal === b?.horizontal
  }).make()

  private _id = `wui-collapse-content-${++collapseContentIdCounter}`
  private _exitTimer?: ReturnType<typeof setTimeout>
  // 动画代际：每次管线启动自增，旧管线的 transitionend/兜底定时器/rAF 全部失效。
  private _generation = 0
  private _lastOpen?: boolean

  override connectedCallback() {
    super.connectedCallback()
    if (!this.id) this.id = this._id
    // 重连后状态可能已过期（断连打断动画等）：清瞬态，交由下次同步重新落稳态。
    this._generation++
    this._clearExitTimer()
    this._lastOpen = undefined
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._clearExitTimer()
  }

  private get _context(): CollapseContentContext | undefined {
    return this._collapseManaged.getContext()
  }

  protected override updated(changed: Map<string, unknown>) {
    const context = this._context
    const open = context?.open === true
    const horizontal = context?.horizontal === true
    // 内部结构标记（非公开属性）：CSS 依赖它切换轴向布局
    this.toggleAttribute('data-open', context !== undefined && open)
    this.toggleAttribute('data-horizontal', horizontal)

    if (!context) {
      // 失去管理（被移出 collapse 等）：清关闭稳态残留，独立使用按可见渲染；
      // 代际自增让在途动画管线静默退场，不把关闭态重新写回。
      this._generation++
      this._clearExitTimer()
      this._lastOpen = undefined
      this.removeAttribute('hidden')
      this._trackInner()?.removeAttribute('inert')
      return
    }

    // 首次同步：直接落到正确稳态，不播动画（与 popover 初始 open 一致）。
    if (this._lastOpen === undefined) {
      this._lastOpen = open
      this._applySteadyState(open)
      return
    }
    if (open === this._lastOpen) {
      // 运行态切换 keep-mounted：关闭稳态需在 hidden/inert 间重新落地。
      if (changed.has('keepMounted') && !open) this._applySteadyState(false)
      return
    }
    this._lastOpen = open
    if (open) this._beginExpand()
    else this._beginCollapse()
  }

  // ===== 稳态 =====

  private _applySteadyState(open: boolean) {
    this._generation++
    this._clearExitTimer()
    const track = this._track()
    const inner = this._trackInner()
    if (open) {
      inner?.removeAttribute('inert')
      if (track) track.dataset.wuiPresence = 'open'
      this.removeAttribute('hidden')
      return
    }
    if (track) delete track.dataset.wuiPresence
    if (this.keepMounted) {
      this.removeAttribute('hidden')
      inner?.setAttribute('inert', '')
    } else {
      inner?.removeAttribute('inert')
      this.setAttribute('hidden', '')
    }
  }

  // ===== 展开管线 =====

  private _beginExpand() {
    this._generation++
    this._clearExitTimer()
    const track = this._track()
    const inner = this._trackInner()
    if (!track) return

    const generation = this._generation
    // 中断关闭动画时 inner 已 inert：先恢复可交互，内容随展开重新可见。
    inner?.removeAttribute('inert')
    this.removeAttribute('hidden')
    // 从 display:none 进入时无先前计算样式可过渡：提交 0fr 起点后再翻转。
    void track.offsetWidth

    requestAnimationFrame(() => {
      if (generation !== this._generation || !this._context?.open) return
      track.dataset.wuiPresence = 'open'
      this._awaitTransition(track, generation, () => this._settle(true))
    })
  }

  // ===== 关闭管线 =====

  private _beginCollapse() {
    this._generation++
    this._clearExitTimer()
    const track = this._track()
    const inner = this._trackInner()
    if (!track) return

    // 收起期间立即阻断交互，防止焦点落入正在消失的区域。
    inner?.setAttribute('inert', '')
    track.dataset.wuiPresence = 'closing'
    const generation = this._generation
    this._awaitTransition(track, generation, () => this._settle(false))
  }

  // 关闭稳态：keep-mounted → 内部 inert（0fr 裁剪保留布局）；默认 → 宿主 hidden。
  private _settle(open: boolean) {
    this._clearExitTimer()
    const inner = this._trackInner()
    if (open) {
      inner?.removeAttribute('inert')
      return
    }
    if (this.keepMounted) {
      inner?.setAttribute('inert', '')
    } else {
      inner?.removeAttribute('inert')
      this.setAttribute('hidden', '')
    }
  }

  // 等待 grid-template-rows/columns 过渡结束；时长为 0（reduced motion、jsdom）
  // 直接稳态，transitionend 不触发时按时长 + 缓冲兜底。
  private _awaitTransition(track: HTMLElement, generation: number, onDone: () => void) {
    const duration = getTransitionDuration(track, 0)
    if (duration === 0) {
      if (generation === this._generation) onDone()
      return
    }

    let settled = false
    const finish = () => {
      track.removeEventListener('transitionend', onTransitionEnd)
      if (this._exitTimer === timer) this._exitTimer = undefined
      clearTimeout(timer)
      // 过渡可能被属性匹配的后续动画触发（如中断重开）：代际不符时静默退场。
      if (settled || generation !== this._generation) return
      settled = true
      onDone()
    }
    const timer = setTimeout(finish, duration + EXIT_FALLBACK_BUFFER)
    this._exitTimer = timer

    const onTransitionEnd = (event: TransitionEvent) => {
      if (
        event.target === track &&
        (event.propertyName === 'grid-template-rows' || event.propertyName === 'grid-template-columns')
      )
        finish()
    }
    track.addEventListener('transitionend', onTransitionEnd)
  }

  private _clearExitTimer() {
    if (this._exitTimer !== undefined) {
      clearTimeout(this._exitTimer)
      this._exitTimer = undefined
    }
  }

  private _track(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-track') ?? null
  }

  private _trackInner(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner') ?? null
  }

  override render() {
    // 未被根元素管理时直接投影（独立使用，无动画）。
    if (!this._collapseManaged.getContext()) {
      return html`<slot></slot>`
    }

    const horizontal = this._context?.horizontal === true

    // grid 0fr↔1fr 过渡：rows 沿高度、columns 沿宽度；inner 的 min-size 归零
    // 是轨道能收缩到 0 的必要条件，overflow hidden 裁剪收起中的内容。
    return html`
      <div class=${horizontal ? 'wui-collapse-track is-horizontal' : 'wui-collapse-track'}>
        <div class="wui-collapse-inner">
          <slot></slot>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-collapse-content': WebUiCollapseContent
  }
}
