import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOpenOverlay } from '@/shared/overlay/open-overlay'
import { FLOATING_PLACEMENTS } from '@/shared/overlay/placement-props'
import { defineOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'

import style from './style.css?inline'

const ALLOWED_TRIGGERS = ['click', 'hover', 'manual'] as const

let popoverIdCounter = 0

@customElement('web-ui-popover')
export class WebUiPopover extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
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
  get trigger(): 'click' | 'hover' | 'manual' {
    return this._trigger
  }
  set trigger(v: string) {
    const old = this._trigger
    this._trigger = normalizeLiteral(v, ALLOWED_TRIGGERS, 'click')
    this.requestUpdate('trigger', old)
  }
  private _trigger: 'click' | 'hover' | 'manual' = 'click'

  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private readonly _userOpenChange = new UserChangeController()
  private _shouldOpenInstantly = true

  private _panelId = `wui-popover-panel-${++popoverIdCounter}`
  private _portal?: OverlayPortal
  /**
   * 开启态浮层（issue #120 Block 1）：本组件不再自行监听 keydown，只声明「我开着」，
   * 由唯一仲裁者决定一次 Escape 关谁。实例作用域的帧事务入口也在这里（合并了原
   * lifecycle）—— 它的 lifetime 长于一次开合（跨 `suspend()`/`resume()`），
   * 但不长于实例本身。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => {
      this._userOpenChange.mark()
      this.open = false
    },
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
    openOverlay: this._overlay
  })

  get isOpen(): boolean {
    return this.open
  }

  override connectedCallback() {
    super.connectedCallback()
    this._overlay.resume()
    document.addEventListener('click', this._onClickOutside)
    this.addEventListener('focusout', this._onFocusOut)
    this._syncTriggerListeners()
  }

  override firstUpdated() {
    // trigger slot 内容增删不触发宿主响应式更新：显式请求一轮渲染，
    // 由 updated() 的 ARIA 回写覆盖晚到的 trigger 元素。
    this.shadowRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.addEventListener('slotchange', () => this.requestUpdate())

    if (this.open) {
      // 建立会话的那一帧没有句柄可作 liveness 凭据：关闭路径会 invalidate()（见 updated），
      // 微任务先于 rAF 排空，因此该帧不可能跨过一次关闭执行。
      this._overlay.scheduleFrame(() => {
        this._openOverlay(this._shouldOpenInstantly)
      })
      this._shouldOpenInstantly = true
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._onClickOutside)
    this.removeEventListener('focusout', this._onFocusOut)
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    // 停止帧调度；撤销登记由 _panel.dispose() 完成（句柄归它持有）。
    this._overlay.suspend()
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
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
        if (this._userOpenChange.consume()) this._dispatchChange(true)
        this._focusPanel()
      } else {
        this._overlay.invalidate()
        this._returnFocus()
        void this._closeOverlay()
        if (this._userOpenChange.consume()) this._dispatchChange(false)
      }
    }

    if (changed.has('trigger')) {
      this.removeEventListener('pointerenter', this._onPointerEnter)
      this.removeEventListener('pointerleave', this._onPointerLeave)
      clearTimeout(this._showTimer)
      clearTimeout(this._hideTimer)
      this._syncTriggerListeners()
    }
    this._syncOverlayInert()
  }

  show() {
    if (this.disabled || this.open) return
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

  private _isInsideShadowRoot(e: MouseEvent): boolean {
    for (const node of e.composedPath()) {
      if (node instanceof Node && node.getRootNode() === this.shadowRoot) return true
    }
    return false
  }

  private _syncTriggerListeners() {
    if (this.trigger === 'hover') {
      this.addEventListener('pointerenter', this._onPointerEnter)
      this.addEventListener('pointerleave', this._onPointerLeave)
    }
  }

  /*
   * `manual` 触发器的 popover 不由用户关闭，但仍是候选：Escape 被它吞掉（同时压掉
   * 原生 cancel），只是不走关闭入口。与旧的「跳过候选」语义不同 —— 旧语义放任 Escape
   * 落到下层浮层，把外层一起关掉。trigger 可在开启期间改写，所以走动态通道同步。
   */
  private _syncOverlayInert() {
    this._panel.getHandle()?.setInert(this.trigger === 'manual')
  }

  private _openOverlay(isInstant = false) {
    /*
     * 登记与仲裁归属由 anchored panel 完成（claim 要求 panel 已就位，祖先链才判得对）。
     * 原实现在这里额外以宿主为 owner 再登记一次：anchor 是宿主 shadow 内的
     * `.popover-trigger` 包装 div（不是会被 slot 重定向的 trigger 内容），其祖先链上
     * 首个已开启浮层与从宿主上溯结果一致，因此那一次是冗余的。
     */
    this._panel.open(isInstant)
    this._syncOverlayInert()
  }

  private _migratableContentNodes(nodes: Node[]): Node[] {
    // 框架注释锚点（v-if/v-for 占位）必须留在宿主：面板内容是实时渲染契约，
    // 框架后续 patch 以宿主内锚点为插入基准，锚点进面板会让插入落空。
    return nodes.filter(node => !(node instanceof Comment) && !(node instanceof HTMLElement && node.slot === 'trigger'))
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'popover-panel portal wui-glass wui-floating-panel',
      // 已迁移节点被框架删除后的解除追踪是 portal 内建默认行为，这里无需 onContentChange
      migrateAddedNodes: addedNodes => this._migratableContentNodes(addedNodes)
    })
    this._portal = portal
    portal.panel.id = this._panelId
    portal.panel.setAttribute('role', 'dialog')
    portal.panel.tabIndex = -1
    portal.panel.addEventListener('pointerenter', this._onPanelPointerEnter)
    portal.panel.addEventListener('pointerleave', this._onPanelPointerLeave)
    portal.moveContent(this._migratableContentNodes(Array.from(this.childNodes)))
    return portal
  }

  private async _closeOverlay() {
    await this._panel.close(() => this.open)
  }

  private _reconfigureOverlay() {
    // portal 变更也会登记 rAF；宿主卸载后不得再通过 reconfigure 重建面板。
    if (!this.isConnected) return
    this._panel.reconfigure(this.open)
    /*
     * reconfigure 重新 claim = 新会话，inert 回到 false。这里的重推是**承重的**，不是
     * 防御性备份：`reconfigure` 不触发 Lit 渲染，`updated()` 那次同步不会跟着来。
     * 实测摘掉本行，「portal 变更后 Escape 仍不关闭」立刻转红（select / autocomplete 的
     * 同类重推则被各自的渲染掩盖，摘掉仍绿）。
     */
    this._syncOverlayInert()
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
    const trigger = this._queryTrigger()
    trigger?.focus()
  }

  private _queryTrigger(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  private _onTriggerClick = (event: MouseEvent) => {
    if (this.disabled) return
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    if (this.trigger === 'hover') return
    if (!this.open) this._shouldOpenInstantly = event.detail === 0
    this._userOpenChange.mark()
    this.toggle()
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this.open) return
    if (this.trigger === 'manual' || this.trigger === 'hover') return
    // 在监听器内部判定：composedPath() 在派发结束后会被清空。
    if (this._panel.getHandle()?.containsEvent(e)) return
    if (this._isInsideShadowRoot(e)) return
    this._userOpenChange.mark()
    this.open = false
  }

  private _onFocusOut = () => {
    if (this.trigger === 'manual' || this.trigger === 'hover') return

    this._overlay.scheduleFrame(() => {
      if (!this.matches(':focus-within') && !this._panel.getHandle()?.hasFocusWithin()) {
        this._userOpenChange.mark()
        this.open = false
      }
    })
  }

  private _onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled || this.trigger !== 'hover') return
    clearTimeout(this._hideTimer)
    this._showTimer = setTimeout(() => {
      this._shouldOpenInstantly = false
      if (this.open) return
      this._userOpenChange.mark()
      this.show()
    }, 100)
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled || this.trigger !== 'hover') return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => {
      if (!this.open) return
      this._userOpenChange.mark()
      this.close()
    }, 100)
  }

  private _onPanelPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.trigger !== 'hover') return
    clearTimeout(this._hideTimer)
  }

  private _onPanelPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.trigger !== 'hover') return
    this._hideTimer = setTimeout(() => {
      if (!this.open) return
      this._userOpenChange.mark()
      this.close()
    }, 100)
  }

  override render() {
    return html`
      <div class="popover-anchor">
        <div
          class="popover-trigger"
          aria-expanded=${String(this.open)}
          aria-controls=${this._panelId}
          @click=${this._onTriggerClick}
        >
          <slot name="trigger"></slot>
        </div>
        <div
          id=${this._panelId}
          class="popover-panel wui-floating-panel wui-glass"
          hidden
          role="dialog"
          tabindex="-1"
          @pointerenter=${this._onPanelPointerEnter}
          @pointerleave=${this._onPanelPointerLeave}
        >
          <slot></slot>
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
