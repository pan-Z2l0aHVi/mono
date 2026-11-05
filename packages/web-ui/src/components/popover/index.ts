import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import overlayMotion from '@/assets/overlay-motion.css?inline'
import glass from '@/classes/glass.css?inline'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { hasOverlayContent } from '@/shared/overlay/content-presence'
import { defineOpenOverlay } from '@/shared/overlay/open-overlay'
import { FLOATING_PLACEMENTS } from '@/shared/overlay/placement-props'
import { defineOverlayPortal, type OverlayContainer, type OverlayPortal } from '@/shared/overlay/portal'
import { defineTriggerController } from '@/shared/overlay/trigger-controller'
import { normalizeTriggerSet } from '@/shared/overlay/trigger-props'

import style from './style.css?inline'

/** 点击 trigger 开合，点 panel 外、失焦与 Escape 都能收。 */
const DEFAULT_TRIGGERS = ['click'] as const

let popoverIdCounter = 0

@customElement('web-ui-popover')
export class WebUiPopover extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this._openValue
  }
  set open(v: boolean) {
    this._triggerController.applyDeclarativeOpen(Boolean(v))
  }
  private _openValue = false
  @property({ type: Boolean, reflect: true }) disabled = false

  @property({ type: String, reflect: true })
  get placement(): Placement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, FLOATING_PLACEMENTS, 'bottom')
    this.requestUpdate('placement', old)
  }
  private _placement: Placement = 'bottom'

  @property({ type: Number })
  get offset(): number {
    return this._offset
  }
  set offset(v: number) {
    const old = this._offset
    this._offset = normalizeNumber(v, 0, 100, 8)
    this.requestUpdate('offset', old)
  }
  private _offset = 8

  @property({ type: String, reflect: true })
  get trigger(): string {
    return this._triggerValue
  }
  set trigger(v: string) {
    const old = this._triggerValue
    this._triggerValue = normalizeTriggerSet(v, DEFAULT_TRIGGERS)
    this.requestUpdate('trigger', old)
  }
  private _triggerValue: string = DEFAULT_TRIGGERS.join(',')

  @property({ type: Number, attribute: 'show-delay' })
  get showDelay(): number {
    return this._showDelay
  }
  set showDelay(v: number) {
    const old = this._showDelay
    this._showDelay = normalizeNumber(v, 0, 5000, 200)
    this.requestUpdate('showDelay', old)
  }
  private _showDelay = 200

  @property({ type: Number, attribute: 'hide-delay' })
  get hideDelay(): number {
    return this._hideDelay
  }
  set hideDelay(v: number) {
    const old = this._hideDelay
    this._hideDelay = normalizeNumber(v, 0, 5000, 100)
    this.requestUpdate('hideDelay', old)
  }
  private _hideDelay = 100

  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _shouldOpenInstantly = true
  private _pendingNotify: boolean | undefined
  /** 本次打开会话是否见过内容；程序式空开不得被后续渲染立即关掉。 */
  private _openedWithContent = false
  // 手势路由、开合状态机与程序式入口在共享接线里；open 的 reactive 存储仍由本组件持有。
  private readonly _triggerController = defineTriggerController({
    host: this,
    getTrigger: () => this.trigger,
    isDisabled: () => this.disabled,
    canOpen: () => true,
    getOpen: () => this._openValue,
    getShowDelay: () => this.showDelay,
    getHideDelay: () => this.hideDelay,
    hoverOpensInstantly: () => false,
    isInsidePanel: event => !!this._panel.getHandle()?.containsEvent(event),
    hasFocusWithin: () => this.matches(':focus-within') || !!this._panel.getHandle()?.hasFocusWithin(),
    requestOpen: meta => this._applyOpen(meta.instant, meta.notify, meta.automatic),
    requestClose: meta => this._applyClose(meta.notify)
  })

  private _panelId = `wui-popover-panel-${++popoverIdCounter}`
  private _portal?: OverlayPortal
  private _panelKeepAliveDisposers: (() => void)[] = []
  private _portalKeepAliveDisposer?: () => void
  /**
   * 开启态 overlay（issue #120 Block 1）：本组件不自行监听 keydown，只声明「我开着」，
   * 由唯一仲裁者决定一次 Escape 关谁。实例作用域的帧事务入口也在这里
   * —— 它的 lifetime 长于一次开合（跨 `suspend()`/`resume()`），
   * 但不长于实例本身。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._triggerController.hide(),
    isConnected: () => this.isConnected
  })
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.popover-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.popover-panel') ?? null,
    getPositioning: () => ({
      placement: this.placement,
      offset: this.offset,
      strategy: this.portal ? 'fixed' : 'absolute'
    }),
    isPortal: () => this.portal,
    createPortal: () => this._createPortal(),
    openOverlay: this._overlay,
    arbitration: () => this._triggerController.arbitration()
  })

  get isOpen(): boolean {
    return this.open
  }

  /** 命令式打开：派发 `open-change`。`none` 下同样可用。 */
  show(options?: { instant?: boolean }): void {
    this._triggerController.show(options)
  }

  /** 命令式收起：派发 `open-change`。 */
  hide(options?: { instant?: boolean }): void {
    this._triggerController.hide(options)
  }

  toggle(options?: { instant?: boolean }): void {
    this._triggerController.toggle(options)
  }

  private _applyOpen(instant: boolean, notify: boolean, automatic: boolean) {
    if (this._openValue) return
    const hasContent = this._hasOverlayContent()
    if (automatic && !hasContent) return
    this._openedWithContent = hasContent
    this._shouldOpenInstantly = instant
    this._openValue = true
    this._pendingNotify = notify
    this.requestUpdate('open', false)
  }

  private _hasOverlayContent() {
    return hasOverlayContent(this._portal?.panel ?? this)
  }

  private _syncOpenWithContent() {
    if (!this._openValue) {
      this._openedWithContent = false
      return
    }
    if (this._hasOverlayContent()) {
      this._openedWithContent = true
      return
    }
    // 打开时就没有内容（程序式空开）保持原状；只有内容从有到无才收起。
    if (this._openedWithContent) this._triggerController.hide()
  }

  private _applyClose(notify: boolean) {
    if (!this._openValue) return
    this._openValue = false
    this._pendingNotify = notify
    this.requestUpdate('open', true)
  }

  override connectedCallback() {
    super.connectedCallback()
    this._overlay.resume()
    this._triggerController.connect()
    // 重连时 shadow DOM 与 panel 元素还在，但断连已撤销 keep-alive 登记，需要重新绑。
    this._bindLocalPanelKeepAlive()
  }

  override firstUpdated() {
    // trigger slot 内容增删不触发宿主响应式更新：显式请求一轮渲染，
    // 由 updated() 的 ARIA 回写覆盖晚到的 trigger 元素。
    this.shadowRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.addEventListener('slotchange', () => this.requestUpdate())

    this._bindLocalPanelKeepAlive()

    if (this.open) {
      // 建立会话的那一帧没有 handle 可作 liveness 凭据：关闭路径会 invalidate()（见 updated），
      // 微任务先于 rAF 排空，因此该帧不可能跨过一次关闭执行。
      this._overlay.scheduleFrame(() => {
        this._openOverlay(this._shouldOpenInstantly)
      })
      this._shouldOpenInstantly = true
    }
  }

  private _bindLocalPanelKeepAlive() {
    const localPanel = this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (localPanel) this._panelKeepAliveDisposers.push(this._triggerController.bindPanelKeepAlive(localPanel))
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._triggerController.disconnect()
    // 停止帧调度；撤销登记由 _panel.dispose() 完成（handle 归它持有）。
    this._overlay.suspend()
    for (const dispose of this._panelKeepAliveDisposers) dispose()
    this._panelKeepAliveDisposers = []
    this._portalKeepAliveDisposer?.()
    this._portalKeepAliveDisposer = undefined
    this._panel.dispose()
  }

  protected override updated(changed: Map<string, unknown>) {
    // ARIA 回写不依赖 open 分支，任何渲染后都保持与宿主状态同步。
    this._syncTriggerAria()

    if (changed.has('portal') || changed.has('overlayContainer')) {
      // 同帧 open + reconfigure 可能排两个回调；先结束旧事务，让 reconfigure 成为本帧唯一入口。
      this._overlay.invalidate()
      this._overlay.scheduleFrame(() => this._reconfigureOverlay())
    } else if (changed.has('placement') || changed.has('offset'))
      requestAnimationFrame(() => this._panel.updatePosition())

    if (changed.has('open')) {
      if (this.open) {
        const isInstant = this._shouldOpenInstantly
        this._shouldOpenInstantly = true
        this._overlay.scheduleFrame(() => {
          this._openOverlay(isInstant)
        })
        this._focusPanel()
      } else {
        this._overlay.invalidate()
        this._returnFocus()
        void this._closeOverlay()
      }
      const notify = this._pendingNotify
      this._pendingNotify = undefined
      if (notify) this._dispatchChange(this.open)
    }

    if (changed.has('trigger')) {
      this._triggerController.syncTriggerChange()
      this._panel.syncArbitration()
    }

    this._syncOpenWithContent()
  }

  private _onContentSlotChange = () => {
    this.requestUpdate()
  }

  private _openOverlay(isInstant = false) {
    /*
     * 登记与仲裁归属由 anchored panel 完成（claim 要求 panel 已就位，祖先链才判得对）。
     * 不必再以宿主为 owner 额外登记一次：anchor 是宿主 shadow 内的
     * `.popover-trigger` 包装 div（不是会被 slot 重定向的 trigger 内容），其祖先链上
     * 首个已开启 overlay 与从宿主上溯结果一致，多出的那次登记是冗余的。
     */
    this._panel.open(isInstant)
  }

  private _migratableContentNodes(nodes: Node[]): Node[] {
    // 框架注释锚点（v-if/v-for 占位）必须留在宿主：panel 内容是实时渲染契约，
    // 框架后续 patch 以宿主内锚点为插入基准，锚点进 panel 会让插入落空。
    return nodes.filter(node => !(node instanceof Comment) && !(node instanceof HTMLElement && node.slot === 'trigger'))
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'popover-panel portal wui-glass wui-floating-panel',
      // 已迁移节点被框架删除后的解除追踪是 portal 内建默认行为；这里只借变化事件
      // 重新评估「还有没有内容」。
      onContentChange: () => this.requestUpdate(),
      migrateAddedNodes: addedNodes => this._migratableContentNodes(addedNodes)
    })
    this._portal = portal
    portal.panel.id = this._panelId
    portal.panel.setAttribute('role', 'dialog')
    portal.panel.tabIndex = -1
    this._portalKeepAliveDisposer?.()
    this._portalKeepAliveDisposer = this._triggerController.bindPanelKeepAlive(portal.panel)
    portal.moveContent(this._migratableContentNodes(Array.from(this.childNodes)))
    return portal
  }

  private async _closeOverlay() {
    await this._panel.close(() => this.open, !this._hasOverlayContent())
  }

  private _reconfigureOverlay() {
    // portal 变更也会登记 rAF；宿主卸载后不得再通过 reconfigure 重建 panel。
    if (!this.isConnected) return
    this._portalKeepAliveDisposer?.()
    this._portalKeepAliveDisposer = undefined
    this._panel.reconfigure(this.open)
  }

  private _dispatchChange(open: boolean) {
    dispatchOpenChangeEvent(this, open)
  }

  /*
   * trigger 包装 div 不可聚焦，AT 读不到其 aria 状态：把 aria-expanded /
   * aria-controls 同步回写到 trigger slot 的首个 assigned element（Q8a）。
   * 包装 div 上的同名属性保留（additive，兼容既有查询）。
   */
  private _syncTriggerAria() {
    const trigger = this._queryTrigger()
    if (!trigger) return
    trigger.setAttribute('aria-expanded', String(this.open))
    trigger.setAttribute('aria-controls', this._panelId)
  }

  private _focusPanel() {
    this._overlay.scheduleFrame(() => {
      const panel = this._panel.getPanel()
      const autofocus = panel?.querySelector<HTMLElement>('[autofocus]')
      if (autofocus && !autofocus.matches(':disabled, [disabled]')) autofocus.focus()
    })
  }

  private _returnFocus() {
    const panel = this._panel.getPanel()
    if (!panel?.matches(':focus-within')) return
    this._queryTrigger()?.focus()
  }

  private _queryTrigger(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  override render() {
    return html`
      <div class="popover-anchor">
        <div
          class="popover-trigger"
          aria-expanded=${String(this.open)}
          aria-controls=${this._panelId}
          @click=${this._triggerController.handleTriggerClick}
        >
          <slot name="trigger"></slot>
        </div>
        <div id=${this._panelId} class="popover-panel wui-floating-panel wui-glass" hidden role="dialog" tabindex="-1">
          <slot @slotchange=${this._onContentSlotChange}></slot>
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
    'web-ui-popover': WebUiPopover
  }
}
