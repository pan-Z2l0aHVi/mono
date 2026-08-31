import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, query } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import { UserChangeController } from '@/shared/events/user-change'
import { getTransitionDuration } from '@/shared/overlay/presence'

import style from './style.css?inline'

const EXIT_FALLBACK_BUFFER = 80

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
 * 内容区在 shadow 内以 grid `0fr ↔ 1fr` track 过渡驱动高度/宽度动画（ADR-0038
 * 选型保留）。关闭稳态三态（消费者 light DOM 永不移动，hidden 全部命令式管理，
 * 避免渲染绑定在关闭动画起点抢先 display:none）：
 * - 默认：content 容器 `hidden`（display:none，脱离渲染与可访问性树）；
 * - `keep-mounted`：inner `inert`（保留在 0fr 轨道内，滚动位置与布局可测量）；
 * - 动画进行中：inner `inert` + track pointer-events 禁用，结束后进入对应稳态。
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

    // 首次同步（含 open 为默认值的场景，changed map 不含默认值属性）：
    // 直接落到正确稳态，不播动画（popover 初始 open 同款）。
    if (this._lastOpen === undefined) {
      this._lastOpen = this.open
      if (this.open) this._applyOpenSteadyState()
      else this._applyClosedSteadyState()
      return
    }

    if (changed.has('keepMounted') && !this.open) {
      // 运行态切换 keep-mounted：关闭稳态需在 hidden/inert 间重新落地。
      this._applyClosedSteadyState()
    }
    if (!changed.has('open') || this.open === this._lastOpen) return

    this._lastOpen = this.open
    if (this._userOpenChange.consume()) this._dispatchChange(this.open)
    if (this.open) this._beginExpand()
    else this._beginCollapse()
  }

  // 打开 collapse
  show() {
    if (this.open) return
    this.open = true
  }

  // 关闭 collapse
  close() {
    if (!this.open) return
    this.open = false
  }

  // 切换 collapse
  toggle() {
    if (this.open) this.close()
    else this.show()
  }

  // ===== trigger slot =====

  private _dispatchChange(open: boolean) {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
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

  // ===== 内容区动画管线（三态语义自 ADR-0038 迁移） =====

  private _applyOpenSteadyState() {
    this._generation++
    this._clearExitTimer()
    const container = this._contentContainer()
    const track = this._contentTrack()
    if (container) container.hidden = false
    if (track) {
      track.dataset.wuiPresence = 'open'
      this._setInnerInert(false)
    }
  }

  private _applyClosedSteadyState() {
    this._generation++
    this._clearExitTimer()
    const container = this._contentContainer()
    const track = this._contentTrack()
    if (track) delete track.dataset.wuiPresence
    if (this.keepMounted) {
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
    track.dataset.wuiPresence = 'closing'
    const generation = this._generation
    this._awaitTransition(track, generation, () => this._settle(false))
  }

  // 关闭稳态：keep-mounted → 内容保留在 0fr 轨道内并 inert；默认 → 容器 hidden。
  private _settle(open: boolean) {
    this._clearExitTimer()
    if (open) {
      this._setInnerInert(false)
      return
    }
    // 落稳态必须清除 closing 瞬态标记：否则 track 永久保留 pointer-events:none
    // 与 exit 过渡配置（keep-mounted 分支同样清除，避免残留）。
    const track = this._contentTrack()
    if (track) delete track.dataset.wuiPresence
    if (this.keepMounted) return
    const container = this._contentContainer()
    this._setInnerInert(false)
    if (container) container.hidden = true
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

  private _setInnerInert(inert: boolean) {
    this.shadowRoot?.querySelector<HTMLElement>('.wui-collapse-inner')?.toggleAttribute('inert', inert)
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
