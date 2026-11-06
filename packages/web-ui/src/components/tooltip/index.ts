import type { Placement } from '@floating-ui/dom'
import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import overlayMotion from '@/assets/overlay-motion.css?inline'
import glass from '@/classes/glass.css?inline'
import { findFocusTarget } from '@/shared/focus/tabbable'
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

/** 默认由指针悬停触发；`none` 表示只由 `open` / `show()` / `hide()` 控制。 */
const DEFAULT_TRIGGERS = ['hover'] as const

let visibleTooltipCount = 0
let tooltipIdCounter = 0

@customElement('web-ui-tooltip')
export class WebUiTooltip extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  @property({ type: String, reflect: true })
  get placement(): Placement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, FLOATING_PLACEMENTS, 'top')
    this.requestUpdate('placement', old)
  }
  private _placement: Placement = 'top'

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

  @property({ type: Boolean, reflect: true }) disabled = false

  @property({ type: Number })
  get offset(): number {
    return this._offset
  }
  set offset(v: number) {
    const old = this._offset
    this._offset = normalizeNumber(v, 0, 100, 6)
    this.requestUpdate('offset', old)
  }
  private _offset = 6

  @property({ type: String }) content = ''

  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this._openValue
  }
  set open(v: boolean) {
    this._triggerController.applyDeclarativeOpen(Boolean(v))
  }
  private _openValue = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _isCountedVisible = false
  private _shouldOpenInstantly = true
  private _pendingNotify: boolean | undefined
  /** 本次打开会话是否见过内容；程序式空开不得被后续渲染立即关掉。 */
  private _openedWithContent = false
  private _portal?: OverlayPortal
  private readonly _panelId = `wui-tooltip-panel-${++tooltipIdCounter}`
  // 手势路由、开合状态机与程序式入口在共享接线里；open 的 reactive 存储仍由本组件持有。
  private readonly _triggerController = defineTriggerController({
    host: this,
    getTrigger: () => this.trigger,
    isDisabled: () => this.disabled,
    canOpen: () => true,
    getOpen: () => this._openValue,
    getShowDelay: () => this.showDelay,
    getHideDelay: () => this.hideDelay,
    hoverOpensInstantly: () => visibleTooltipCount > 0,
    isInsidePanel: event => !!this._panel.getHandle()?.containsEvent(event),
    hasFocusWithin: () => this.matches(':focus-within') || !!this._panel.getHandle()?.hasFocusWithin(),
    requestOpen: meta => this._applyOpen(meta.instant, meta.notify, meta.automatic),
    requestClose: meta => this._applyClose(meta.notify)
  })
  /*
   * 面板在 shadow DOM 里，而 trigger 的可聚焦元素可能在更内层的 shadow root：
   * `aria-describedby` 的 IDREF 无法跨 shadow 边界解析，面板 id 因此只能供消费者自行引用，
   * 读屏可达性由 `aria-description` 承担（打开时写入、关闭时按原值还原）。
   * 保存原值是为了不吞掉消费者自己写在 trigger 上的描述。
   */
  private readonly _descriptionTargets = new Map<HTMLElement, string | null>()
  /**
   * 实例作用域的帧事务入口。`requestClose` 是 Escape 的关闭入口：tooltip 默认是
   * Escape 候选，`trigger="none"` 时由 panel 的仲裁策略退出候选。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._triggerController.hide(),
    isConnected: () => this.isConnected
  })
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.tooltip-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.tooltip-panel') ?? null,
    getPositioning: () => ({
      placement: this.placement,
      offset: this.offset,
      strategy: this.portal ? 'fixed' : 'absolute'
    }),
    isPortal: () => this.portal,
    createPortal: () => this._createPortal(),
    openOverlay: this._overlay,
    // `none` 在逻辑组合树里但不参与 Escape 归属：按键穿过它落到下层 overlay。
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

  override connectedCallback() {
    super.connectedCallback()
    this._overlay.resume()
    this._triggerController.connect()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._triggerController.disconnect()
    // 停止帧调度；撤销登记由 _panel.dispose() 完成（handle 归它持有）。
    this._overlay.suspend()
    this._syncVisibleTooltipCount(false)
    this._clearDescription()
    this._panel.dispose()
  }

  override firstUpdated() {
    if (this.open) {
      this._openOverlay(this._shouldOpenInstantly)
      this._shouldOpenInstantly = true
      this._syncDescription()
    }
  }

  protected override willUpdate(changed: Map<string, unknown>) {
    if (this.disabled && (changed.has('disabled') || changed.has('open'))) {
      this._triggerController.cancelPending()
      if (this._openValue) this._applyClose(true)
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('trigger')) {
      this._triggerController.syncTriggerChange()
      this._panel.syncArbitration()
    }
    if (changed.has('portal') || changed.has('overlayContainer')) {
      // 同帧 open + reconfigure 可能重复建事务；invalidate 保证 reconfigure 是当前唯一帧回调。
      this._overlay.invalidate()
      this._overlay.scheduleFrame(() => this._reconfigureOverlay())
    } else if (changed.has('placement') || changed.has('offset'))
      requestAnimationFrame(() => this._panel.updatePosition())

    if (changed.has('open')) {
      this._syncVisibleTooltipCount(this.open)
      if (this.open) {
        this._triggerController.cancelPending()
        this._openOverlay(this._shouldOpenInstantly)
        this._shouldOpenInstantly = true
        this._syncDescription()
      } else {
        this._overlay.invalidate()
        this._clearDescription()
        void this._closeOverlay()
      }
      const notify = this._pendingNotify
      this._pendingNotify = undefined
      if (notify) this._dispatchChange(this.open)
    }
    if (changed.has('content')) {
      this._syncPortalContent()
      if (this.open) this._syncDescription()
    }

    this._syncOpenWithContent()
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

  /*
   * tooltip 的内容只有两个来源：`content` 文本或 `slot="content"` 节点。
   * 默认 trigger 在默认 slot 里，不能算内容；portal 里的 `.tooltip-text` 是
   * `content` 的渲染产物，没有 slot 属性，因此也不会被误判。
   */
  private _hasOverlayContent() {
    if (this.content.trim()) return true
    return hasOverlayContent(this._portal?.panel ?? this, node =>
      node instanceof Element && node.slot === 'content' ? undefined : false
    )
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

  private _openOverlay(isInstant = false) {
    this._panel.open(isInstant)
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'tooltip-panel portal wui-glass wui-floating-panel',
      // 已迁移节点被框架删除后的解除追踪是 portal 内建默认行为；这里只借变化事件
      // 重新评估「还有没有内容」。
      onContentChange: () => this.requestUpdate(),
      // 打开期实时渲染：新增的 slot=content 元素实时迁入 panel（注释锚点无法携带
      // slot 属性，天然留在宿主作为框架 patch 的插入基准）。
      migrateAddedNodes: addedNodes =>
        addedNodes.filter(node => node instanceof Element && node.getAttribute('slot') === 'content')
    })
    this._portal = portal
    if (this.content) {
      const text = document.createElement('span')
      text.className = 'tooltip-text'
      text.textContent = this.content
      portal.panel.append(text)
    } else portal.moveContent(Array.from(this.querySelectorAll('[slot="content"]')))
    portal.panel.setAttribute('role', 'tooltip')
    portal.panel.id = this._panelId
    return portal
  }

  private async _closeOverlay() {
    await this._panel.close(() => this.open, !this._hasOverlayContent())
  }

  private _reconfigureOverlay() {
    this._panel.reconfigure(this.open)
  }

  private _syncPortalContent() {
    if (!this.portal || !this.open) return
    const localPanel = this._panel.getPanel()
    if (!localPanel) return
    const panel = this._portal?.panel ?? localPanel
    const text = localPanel.querySelector<HTMLElement>('.tooltip-text')
    if (text) {
      text.textContent = this.content
      return
    }
    if (!this.content) return
    panel.replaceChildren()
    const nextText = document.createElement('span')
    nextText.className = 'tooltip-text'
    nextText.textContent = this.content
    panel.append(nextText)
  }

  private _dispatchChange(open: boolean) {
    dispatchOpenChangeEvent(this, open)
  }

  private _getDescriptionTargets(): HTMLElement[] {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('.tooltip-trigger > slot')
    const targets: HTMLElement[] = []
    for (const element of slot?.assignedElements({ flatten: true }) ?? []) {
      if (!(element instanceof HTMLElement)) continue
      targets.push(findFocusTarget(element) ?? element)
    }
    return targets
  }

  private _readDescription(): string {
    if (this.content) return this.content.trim()
    const portalText = this.portal ? (this._portal?.panel.textContent ?? '').trim() : ''
    if (portalText) return portalText
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('.tooltip-panel > slot[name="content"]')
    return (slot?.assignedNodes({ flatten: true }) ?? [])
      .map(node => node.textContent ?? '')
      .join('')
      .trim()
  }

  private _syncDescription() {
    if (!this.open) {
      this._clearDescription()
      return
    }
    const description = this._readDescription()
    if (!description) {
      this._clearDescription()
      return
    }
    const targets = new Set(this._getDescriptionTargets())
    for (const [target, previous] of this._descriptionTargets) {
      if (targets.has(target)) continue
      this._restoreDescription(target, previous)
      this._descriptionTargets.delete(target)
    }
    for (const target of targets) {
      if (!this._descriptionTargets.has(target)) {
        this._descriptionTargets.set(target, target.getAttribute('aria-description'))
      }
      target.setAttribute('aria-description', description)
    }
  }

  private _clearDescription() {
    for (const [target, previous] of this._descriptionTargets) this._restoreDescription(target, previous)
    this._descriptionTargets.clear()
  }

  private _restoreDescription(target: HTMLElement, previous: string | null) {
    if (previous === null) target.removeAttribute('aria-description')
    else target.setAttribute('aria-description', previous)
  }

  private _onTriggerSlotChange = () => {
    if (this.open) this._syncDescription()
  }

  private _onContentSlotChange = () => {
    this.requestUpdate()
    if (this.open) this._syncDescription()
  }

  private _syncVisibleTooltipCount(isVisible: boolean) {
    if (isVisible && !this._isCountedVisible) {
      visibleTooltipCount += 1
      this._isCountedVisible = true
    } else if (!isVisible && this._isCountedVisible) {
      visibleTooltipCount = Math.max(0, visibleTooltipCount - 1)
      this._isCountedVisible = false
    }
  }

  override render() {
    return html`
      <div class="tooltip-anchor">
        <!-- 点击只挂在 trigger 包装层：panel 里的内容被点击不该把提示切走。 -->
        <div class="tooltip-trigger" @click=${this._triggerController.handleTriggerClick}>
          <slot @slotchange=${this._onTriggerSlotChange}></slot>
        </div>
        <div
          class="tooltip-panel wui-floating-panel wui-glass"
          hidden
          role="tooltip"
          id=${this.portal ? nothing : this._panelId}
        >
          ${
            this.content
              ? html`<span class="tooltip-text">${this.content}</span>`
              : html`<slot name="content" @slotchange=${this._onContentSlotChange}></slot>`
          }
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
    'web-ui-tooltip': WebUiTooltip
  }
}
