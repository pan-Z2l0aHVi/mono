import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import { UserChangeController } from '@/shared/events/user-change'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { getTransitionDuration } from '@/shared/overlay/presence'

import style from './style.css?inline'

const EXIT_FALLBACK_BUFFER = 80

/** peek 边缘晕染的活动长度：关闭/收起态取 peek-edge，展开态归 0。 */
const PEEK_EDGE_ACTIVE = '--wui-collapse-peek-edge-active'

/*
 * 注册成 `<length>` 才能被 transition 插值（未注册的自定义属性是离散值，只能瞬变）。
 *
 * 必须用 JS 的 `CSS.registerProperty` 而不是 CSS 里的 `@property`：实测后者写在
 * shadow root 的样式表里不产生注册（getComputedStyle 读打开态得到空串而非
 * initial-value），而自定义属性的注册本质上是 document 级的。
 * 注册失败（jsdom、旧浏览器、重复注册）时降级为离散过渡——渐变带长度瞬变，
 * 但位置百分比仍跟随裁剪边缘，行为依旧正确。
 */
function registerPeekEdgeActive() {
  // jsdom 与不支持的环境直接跳过；样式里的 var() fallback 保证声明仍然有效。
  if (typeof CSS === 'undefined' || typeof CSS.registerProperty !== 'function') return
  try {
    CSS.registerProperty({
      name: PEEK_EDGE_ACTIVE,
      syntax: '<length>',
      inherits: false,
      initialValue: '0px'
    })
  } catch {
    // 已注册过（HMR、多份副本）或定义冲突：保持现有注册即可。
  }
}

registerPeekEdgeActive()

let collapseIdCounter = 0

/**
 * 文档流内折叠面板：trigger 经默认 slot 提供，内容经 `slot="content"` 提供。
 *
 * trigger 语义完全来自 slot 进来的交互元素（原生 button / web-ui-button 等）：
 * Enter/Space 激活走该元素的原生 click，不做 role="button" 补齐；组件把
 * `aria-expanded` / `aria-controls` / `aria-disabled` 回写到首个 assigned
 * element（与 popover trigger 的既定回写模式一致）。wrapper 仅负责点击代理，
 * 不可聚焦，不承载 ARIA。
 *
 * 内容区在 shadow 内以 grid `0fr ↔ 1fr` track 过渡驱动高度/宽度动画（ADR-0030
 * 选型保留）。关闭稳态三态（消费者 light DOM 永不移动，hidden 全部命令式管理，
 * 避免渲染绑定在关闭动画起点抢先 display:none）：
 * - 默认：content 容器 `hidden`（display:none，脱离渲染与可访问性树）；
 * - `keep-mounted`：inner `inert`（保留在 0fr 轨道内，滚动位置与布局可测量）；
 * - `peek`：inner `inert`，轨道停在固定长度的裁剪窗口，只露出内容头部；
 * - 动画进行中：inner `inert` + track pointer-events 禁用，结束后进入对应稳态。
 *
 * `peek` 与展开态之间是固定长度与内容自适应高度的过渡，CSS 无法插值；这两个
 * 方向的动画改为读出像素后以显式长度写入轨道，落稳态时清除内联值交回 CSS 规则。
 */
@customElement('web-ui-collapse')
export class WebUiCollapse extends LitElement {
  static override styles = unsafeCSS(style)

  /** 展开状态；严格受控，唯一状态源。 */
  @property({ type: Boolean, reflect: true }) open = false

  /** 禁用触发：点击忽略、aria-disabled 写入 trigger 元素；已展开内容保持现状。 */
  @property({ type: Boolean, reflect: true }) disabled = false

  /** 水平方向：true 时沿宽度展开，默认沿高度。 */
  @property({ type: Boolean, reflect: true }) horizontal = false

  /** 关闭稳态保持内容 `inert` 而非 `hidden`（保留滚动位置，可测量）。 */
  @property({ type: Boolean, reflect: true, attribute: 'keep-mounted' }) keepMounted = false

  /**
   * 关闭稳态露出的尺寸（CSS 长度，如 `120px`、`6rem`），沿动画轴生效：默认是高度，
   * `horizontal` 时为宽度；未设置时保持完全收起。
   *
   * 设置后关闭稳态语义等同 `keep-mounted`（内容留在轨道内、`inert` 阻断交互），
   * 只露出 `peek` 范围内的部分；内容本身不足 `peek` 时按内容实际尺寸收起。
   * 注意 `peek` 是固定长度与内容自适应高度之间的过渡：CSS 无法在两者之间插值，
   * 因此这两个方向的动画由本组件读出内容尺寸后以显式长度驱动（其余路径仍是
   * 零测量的 grid fr 过渡）。
   */
  @property({ type: String, reflect: true }) peek: string | null = null

  /**
   * peek 露出区域末端的边缘晕染长度（CSS 长度，如 `24px`、`2rem`）。
   *
   * 沿动画轴末端（默认底边、`horizontal` 时右边）做 alpha 渐变，让"被裁掉的部分"
   * 与"露出的部分"之间柔和过渡，提示下方还有内容。默认空字符串表示关闭晕染。
   *
   * 颜色通过 CSS 变量 `--wui-collapse-peek-edge-color` 覆盖，值需为带 alpha 通道
   * 的色值（如 `rgba(0,0,0,0)`）——mask-image 默认按 alpha 模式解析。
   */
  @property({ type: String, reflect: true, attribute: 'peek-edge' }) peekEdge = ''

  @query('.wui-collapse-trigger-wrapper') private _triggerWrapper!: HTMLElement

  private _contentId = `wui-collapse-content-${++collapseIdCounter}`

  private readonly _userOpenChange = new UserChangeController()

  private _exitTimer?: ReturnType<typeof setTimeout>
  // 动画代际：每次管线启动自增，旧管线的 transitionend/兜底定时器/rAF 全部失效。
  private _generation = 0
  private _lastOpen?: boolean

  override connectedCallback() {
    super.connectedCallback()
    // 点击监听与生命周期同寿（宿主移除即整体销毁），无需 disconnected 清理。
    this.addEventListener('click', this._onTriggerClick)
    // 断连可能打断动画管线（瞬态残留：presence='closing'、容器未 hidden）。
    // 首次连接不必处理（初始 render 走 _lastOpen===undefined 落稳态，请求多余
    // 渲染会触发「scheduled an update after update completed」告警）；重连时
    // 重置同步状态并强制一轮 update，由首次同步分支重新落稳态、丢弃在途管线。
    if (this.hasUpdated) {
      this._generation++
      this._clearExitTimer()
      this._lastOpen = undefined
      this.requestUpdate()
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._clearExitTimer()
  }

  protected override updated(changed: Map<string, unknown>) {
    // ARIA 回写不依赖 open 分支，任何渲染后都保持与宿主状态同步。
    this._syncTriggerAria()
    // peek 的稳态长度与动画写入共用轨道内联样式，先同步再落稳态，避免被稳态清除。
    this._syncPeek()

    // 首次同步（含 open 为默认值的场景，changed map 不含默认值属性）：
    // 直接落到正确稳态，不播动画（popover 初始 open 同款）。
    if (this._lastOpen === undefined) {
      this._lastOpen = this.open
      if (this.open) this._applyOpenSteadyState()
      else this._applyClosedSteadyState()
      return
    }

    if ((changed.has('keepMounted') || changed.has('peek')) && !this.open) {
      // 运行态切换 keep-mounted / peek：关闭稳态需在 hidden / inert / 裁剪长度间重新落地。
      this._applyClosedSteadyState()
    }
    if (!changed.has('open') || this.open === this._lastOpen) return

    this._lastOpen = this.open
    if (this._userOpenChange.consume()) this._dispatchChange(this.open)
    if (this.open) this._beginExpand()
    else this._beginCollapse()
  }

  show() {
    if (this.open) return
    this.open = true
  }

  close() {
    if (!this.open) return
    this.open = false
  }

  toggle() {
    if (this.open) this.close()
    else this.show()
  }

  // ===== trigger slot =====

  private _dispatchChange(open: boolean) {
    dispatchOpenChangeEvent(this, open)
  }

  /*
   * 点击代理：冒泡路径穿过 trigger wrapper 的 click 一律切换。语义由 slot 内
   * 的交互元素（原生 button / web-ui-button）提供；slot 放纯文本时无激活语义
   * （README 约定）。内容区与嵌套内层 collapse 的 click 不经过本 wrapper，天然隔离。
   */
  private _onTriggerClick = (event: MouseEvent) => {
    if (this.disabled) return
    if (!event.composedPath().includes(this._triggerWrapper)) return
    this._userOpenChange.mark()
    this.toggle()
  }

  /*
   * Trigger 元素取首个 assigned element（与 popover `_queryTrigger` 同款惰性查询，
   * 不依赖 slotchange——jsdom 不派发该事件，无法用状态缓存）。slot 为空时无回写目标。
   */
  private _queryTrigger(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('.wui-collapse-trigger-wrapper slot')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  /*
   * slot 内容增删不触发宿主响应式更新：显式请求一轮渲染，由 updated() 的
   * ARIA 回写覆盖晚到的 trigger 元素（slotchange 在 jsdom 不派发，无法监听）。
   */
  private readonly _onTriggerSlotChange = () => {
    this.requestUpdate()
  }

  // ARIA 状态回写到 trigger 元素本身（wrapper 不可聚焦，AT 读不到）。
  private _syncTriggerAria() {
    const trigger = this._queryTrigger()
    if (!trigger) return
    trigger.setAttribute('aria-expanded', String(this.open))
    trigger.setAttribute('aria-controls', this._contentId)
    if (this.disabled) trigger.setAttribute('aria-disabled', 'true')
    else trigger.removeAttribute('aria-disabled')
  }

  // ===== 内容区动画管线（三态语义自 ADR-0030 迁移） =====

  /** 关闭稳态是否露出部分内容；空值与非空判断避免 `peek=""` 被当作有效长度。 */
  private get _peeks(): boolean {
    return typeof this.peek === 'string' && this.peek.trim() !== ''
  }

  private _applyOpenSteadyState() {
    this._generation++
    this._clearExitTimer()
    const container = this._contentContainer()
    const track = this._contentTrack()
    if (container) container.hidden = false
    if (track) track.dataset.wuiPresence = 'open'
    this._clearInnerClamp()
    this._setInnerInert(false)
  }

  private _applyClosedSteadyState() {
    this._generation++
    this._clearExitTimer()
    const container = this._contentContainer()
    const track = this._contentTrack()
    if (track) delete track.dataset.wuiPresence
    this._clearInnerClamp()
    if (this.keepMounted || this._peeks) {
      if (container) container.hidden = false
      this._setInnerInert(true)
      return
    }
    this._setInnerInert(false)
    if (container) container.hidden = true
  }

  private _beginExpand() {
    this._generation++
    this._clearExitTimer()
    const container = this._contentContainer()
    const track = this._contentTrack()
    if (!container || !track) return

    const generation = this._generation
    // 中断关闭动画时 inner 已 inert：先恢复可交互，内容随展开重新可见。
    this._setInnerInert(false)
    // 从 display:none 进入时无先前计算样式可过渡：提交 0fr 起点后再翻转。
    container.hidden = false

    if (this._peeks) {
      const inner = this._contentInner()
      // 无过渡时长（reduced motion、jsdom）或无 inner 时不做测量，直接落展开稳态。
      if (!inner || getTransitionDuration(inner, 0) === 0) {
        this._applyOpenSteadyState()
        return
      }
      /*
       * peek 的裁剪长度是固定值，展开目标是内容自适应高度，两者无法由 CSS 插值，
       * 动画必须由两个显式长度驱动：起点是当前露出的长度，目标是内容完整尺寸。
       * 起点要在同任务内先写入并提交回流，否则过渡会退化成跳变（实测分帧写入
       * 反而完全不参与插值判定）；目标读 inner 的 scroll 尺寸，不写探针样式。
       */
      const from = this._measureInnerSize(inner)
      const to = this._measureContentSize(inner)
      this._setInnerClamp(inner, `${from}px`)
      void this._measureInnerSize(inner)
      track.dataset.wuiPresence = 'open'
      this._setInnerClamp(inner, `${to}px`)
      this._awaitTransition(inner, generation, () => this._settle(true), [this._clampProperty()])
      return
    }

    void track.offsetWidth

    requestAnimationFrame(() => {
      if (generation !== this._generation || !this.open) return
      track.dataset.wuiPresence = 'open'
      this._awaitTransition(track, generation, () => this._settle(true))
    })
  }

  private _beginCollapse() {
    this._generation++
    this._clearExitTimer()
    const track = this._contentTrack()
    if (!track) return

    // 收起期间立即阻断交互，防止焦点落入正在消失的区域。
    this._setInnerInert(true)
    const generation = this._generation

    if (this._peeks) {
      const inner = this._contentInner()
      // 无过渡时长（reduced motion、jsdom）或无 inner 时不做测量，直接落裁剪稳态。
      if (!inner || getTransitionDuration(inner, 0) === 0) {
        this._applyClosedSteadyState()
        return
      }
      /*
       * 收起目标是 `peek` 长度本身：与内容尺寸的较小值由 CSS 稳态规则解析，
       * 动画只需把当前展开长度过渡到这个长度。起点同样要先写入并提交回流，
       * 顺序与 _beginExpand 一致。
       */
      const from = this._measureInnerSize(inner)
      this._setInnerClamp(inner, `${from}px`)
      void this._measureInnerSize(inner)
      track.dataset.wuiPresence = 'closing'
      this._setInnerClamp(inner, `${this.peek}`)
      this._awaitTransition(inner, generation, () => this._settle(false), [this._clampProperty()])
      return
    }

    track.dataset.wuiPresence = 'closing'
    this._awaitTransition(track, generation, () => this._settle(false))
  }

  // 关闭稳态：keep-mounted → 内容保留在 0fr 轨道内并 inert；peek → 保留在裁剪
  // 窗口内并 inert；默认 → 容器 hidden。
  private _settle(open: boolean) {
    this._clearExitTimer()
    const track = this._contentTrack()
    // peek 过渡以显式长度写入 inner：落稳态一律清除，交回 CSS 稳态规则（长度声明）。
    this._clearInnerClamp()
    if (open) {
      this._setInnerInert(false)
      return
    }
    // 落稳态必须清除 closing 瞬态标记：否则 track 永久保留 pointer-events:none
    // 与 exit 过渡配置（keep-mounted 分支同样清除，避免残留）。
    if (track) delete track.dataset.wuiPresence
    if (this.keepMounted || this._peeks) return
    const container = this._contentContainer()
    this._setInnerInert(false)
    if (container) container.hidden = true
  }

  // 等待动画属性过渡结束；时长为 0（reduced motion、jsdom）直接稳态，
  // transitionend 不触发时按时长 + 缓冲兜底。默认等待 grid 轨道过渡；peek 的
  // 过渡落在 inner 的裁剪长度上，由调用方传入对应属性。
  private _awaitTransition(
    animated: HTMLElement,
    generation: number,
    onDone: () => void,
    properties: readonly string[] = ['grid-template-rows', 'grid-template-columns']
  ) {
    const duration = getTransitionDuration(animated, 0)
    if (duration === 0) {
      if (generation === this._generation) onDone()
      return
    }

    let settled = false
    const finish = () => {
      animated.removeEventListener('transitionend', onTransitionEnd)
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
      if (event.target === animated && properties.includes(event.propertyName)) finish()
    }
    animated.addEventListener('transitionend', onTransitionEnd)
  }

  private _clearExitTimer() {
    if (this._exitTimer !== undefined) {
      clearTimeout(this._exitTimer)
      this._exitTimer = undefined
    }
  }

  // ===== peek 尺寸读写（裁剪长度落在 inner 上，轨道只负责 1fr 与裁剪窗口） =====

  /*
   * peek 长度经自定义属性下发给 shadow 样式规则，而不是直接写 inner 的裁剪长度：
   * 关闭稳态由 CSS 声明（长度与内容尺寸的较小值由 CSS 原生解析），动画写入的内联
   * 长度在其上覆盖，落稳态时清除即可回到声明值。
   */
  private _syncPeek() {
    const track = this._contentTrack()
    if (!track) return
    track.toggleAttribute('data-wui-peek', this._peeks)
    if (this._peeks) {
      track.style.setProperty('--wui-collapse-peek', this.peek ?? '')
      // `[data-wui-peek-edge]` 与 `--wui-collapse-peek-edge` 配合：attribute 让 mask
      // 规则选择器命中（未设 peek-edge 时不命中 → mask-image 保持默认 none），
      // CSS 变量负责渐变长度的运行时同步。
      if (this._peekEdges) {
        track.setAttribute('data-wui-peek-edge', '')
        track.style.setProperty('--wui-collapse-peek-edge', this.peekEdge)
      } else {
        track.removeAttribute('data-wui-peek-edge')
        track.style.removeProperty('--wui-collapse-peek-edge')
      }
    } else {
      track.style.removeProperty('--wui-collapse-peek')
      track.removeAttribute('data-wui-peek-edge')
      track.style.removeProperty('--wui-collapse-peek-edge')
    }
  }

  /** peek 露出区域是否启用边缘晕染；`peek` 未设置或 `peekEdge` 为空都视为关闭。 */
  private get _peekEdges(): boolean {
    return this._peeks && this.peekEdge.trim() !== ''
  }

  private _clampProperty(): 'max-height' | 'max-width' {
    return this.horizontal ? 'max-width' : 'max-height'
  }

  private _measureInnerSize(inner: HTMLElement): number {
    return this.horizontal ? inner.offsetWidth : inner.offsetHeight
  }

  /*
   * 内容在动画轴上的完整尺寸（px）：裁剪只作用在 inner 的 max-height/max-width 上，
   * 被测内容的布局盒子仍是完整尺寸，故读 scroll 尺寸即可，不写任何样式——写样式
   * 会被 grid 过渡机制当作过渡起点读取，必须避开。
   */
  private _measureContentSize(inner: HTMLElement): number {
    return this.horizontal ? inner.scrollWidth : inner.scrollHeight
  }

  private _setInnerClamp(inner: HTMLElement, size: string) {
    inner.style.setProperty(this._clampProperty(), size)
  }

  private _clearInnerClamp() {
    const inner = this._contentInner()
    if (!inner) return
    inner.style.removeProperty('max-height')
    inner.style.removeProperty('max-width')
  }

  private _setInnerInert(inert: boolean) {
    this._contentInner()?.toggleAttribute('inert', inert)
  }

  private _contentInner(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner') ?? null
  }

  private _contentContainer(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-content') ?? null
  }

  private _contentTrack(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-track') ?? null
  }

  override render() {
    // 三态由 data-wui-presence 驱动（open/closing），缺省即关闭稳态。
    const trackClass = {
      'wui-collapse-track': true,
      'is-horizontal': this.horizontal
    }

    return html`
      <div class="wui-collapse-trigger-wrapper" @slotchange=${this._onTriggerSlotChange}><slot></slot></div>
      <div class="wui-collapse-content">
        <div class=${classMap(trackClass)} id=${this._contentId}>
          <div class="wui-collapse-inner">
            <slot name="content"></slot>
          </div>
        </div>
      </div>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-collapse': WebUiCollapse
  }
}
