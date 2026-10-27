import type { Placement } from '@floating-ui/dom'
import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import overlayMotion from '@/assets/overlay-motion.css?inline'
import glass from '@/classes/glass.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
import { findFocusTarget } from '@/shared/focus/tabbable'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOpenOverlay } from '@/shared/overlay/open-overlay'
import { FLOATING_PLACEMENTS } from '@/shared/overlay/placement-props'
import { defineOverlayPortal, type OverlayContainer, type OverlayPortal } from '@/shared/overlay/portal'

import style from './style.css?inline'

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

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _isCountedVisible = false
  private readonly _userOpenChange = new UserChangeController()
  private _shouldOpenInstantly = true
  private _portal?: OverlayPortal
  private readonly _panelId = `wui-tooltip-panel-${++tooltipIdCounter}`
  /*
   * 面板在 shadow DOM 里，而 trigger 的可聚焦元素可能在更内层的 shadow root：
   * `aria-describedby` 的 IDREF 无法跨 shadow 边界解析，面板 id 因此只能供消费者自行引用，
   * 读屏可达性由 `aria-description` 承担（打开时写入、关闭时按原值还原）。
   * 保存原值是为了不吞掉消费者自己写在 trigger 上的描述。
   */
  private readonly _descriptionTargets = new Map<HTMLElement, string | null>()
  /**
   * 实例作用域的帧事务入口。`requestClose` 是关闭入口的唯一接线：panel 的
   * `arbitration: 'none'` 让 tooltip 在组合树里但永不成候选，因此这条**现在不会被
   * 模块调用**。保留它是不想把「怎么关」藏起来，也让仲裁策略变化时依然成立。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._hide(),
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
    // tooltip 在逻辑组合树里（panel 迁移后仍要判对「谁在谁里面」），但从不作为 Escape
    // 候选：按键穿过它落到下层 overlay。
    arbitration: 'none'
  })

  get isOpen(): boolean {
    return this.open
  }

  override connectedCallback() {
    super.connectedCallback()
    this._overlay.resume()
    this.addEventListener('pointerenter', this._onPointerEnter)
    this.addEventListener('pointerleave', this._onPointerLeave)
    this.addEventListener('focusin', this._onFocusIn)
    this.addEventListener('focusout', this._onFocusOut)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    this.removeEventListener('focusin', this._onFocusIn)
    this.removeEventListener('focusout', this._onFocusOut)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
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
      clearTimeout(this._showTimer)
      clearTimeout(this._hideTimer)
      this.open = false
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('portal') || changed.has('overlayContainer')) {
      // 同帧 open + reconfigure 可能重复建事务；invalidate 保证 reconfigure 是当前唯一帧回调。
      this._overlay.invalidate()
      this._overlay.scheduleFrame(() => this._reconfigureOverlay())
    } else if (changed.has('placement') || changed.has('offset'))
      requestAnimationFrame(() => this._panel.updatePosition())

    if (changed.has('open')) {
      this._syncVisibleTooltipCount(this.open)
      if (this.open) {
        clearTimeout(this._hideTimer)
        this._openOverlay(this._shouldOpenInstantly)
        this._shouldOpenInstantly = true
        this._syncDescription()
      } else {
        this._overlay.invalidate()
        this._clearDescription()
        void this._closeOverlay()
      }
      if (this._userOpenChange.consume()) this._dispatchChange(this.open)
    }
    if (changed.has('content')) {
      this._syncPortalContent()
      if (this.open) this._syncDescription()
    }
  }

  private _onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled) return
    clearTimeout(this._hideTimer)
    // 已有 tooltip 在场时（指针滑到相邻目标）：既不等延迟，也不播入场动画。
    const isRepeat = visibleTooltipCount > 0
    this._showTimer = setTimeout(() => this._show(isRepeat), isRepeat ? 0 : this.showDelay)
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => this._hide(), this.hideDelay)
  }

  private _onFocusIn = (event: FocusEvent) => {
    if (this.disabled) return

    const focusedElement = event.composedPath()[0] ?? event.target
    if (!(focusedElement instanceof Element) || !focusedElement.matches(':focus-visible')) return

    clearTimeout(this._hideTimer)
    this._show(true)
  }

  private _onFocusOut = () => {
    clearTimeout(this._showTimer)
    this._hide()
  }

  private _show(isInstant = false) {
    if (this.open) return
    this._shouldOpenInstantly = isInstant
    this._userOpenChange.mark()
    this.open = true
  }

  private _hide() {
    if (!this.open) return
    this._userOpenChange.mark()
    this.open = false
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
      // 已迁移节点被框架删除后的解除追踪是 portal 内建默认行为，这里无需 onContentChange
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
    await this._panel.close(() => this.open)
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
        <div class="tooltip-trigger"><slot @slotchange=${this._onTriggerSlotChange}></slot></div>
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
