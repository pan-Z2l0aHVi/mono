import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { defineOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = [
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end'
] as const

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
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'bottom')
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
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.popover-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.popover-panel') ?? null,
    getPositioning: () => ({
      placement: this.placement,
      offset: this.offset,
      strategy: this.portal ? 'fixed' : 'absolute'
    }),
    isPortal: () => this.portal,
    createPortal: () => this._createPortal()
  })

  get isOpen(): boolean {
    return this.open
  }

  override connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._onClickOutside)
    document.addEventListener('keydown', this._onKeydown)
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
      requestAnimationFrame(() => this._openOverlay(this._shouldOpenInstantly))
      this._shouldOpenInstantly = true
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._onClickOutside)
    document.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('focusout', this._onFocusOut)
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    this._panel.dispose()
  }

  protected override updated(changed: Map<string, unknown>) {
    // ARIA 回写不依赖 open 分支，任何渲染后都保持与宿主状态同步。
    this._syncTriggerAria()

    if (changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())
    else if (changed.has('placement') || changed.has('offset'))
      requestAnimationFrame(() => this._panel.updatePosition())

    if (changed.has('open')) {
      if (this.open) {
        const isInstant = this._shouldOpenInstantly
        this._shouldOpenInstantly = true
        requestAnimationFrame(() => this._openOverlay(isInstant))
        if (this._userOpenChange.consume()) this._dispatchChange(true)
        this._focusPanel()
      } else {
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

  private _openOverlay(isInstant = false) {
    this._panel.open(isInstant)
  }

  private _createPortal(): OverlayPortal {
    const portal = defineOverlayPortal().make({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'popover-panel portal wui-glass wui-floating-panel'
    })
    portal.panel.id = this._panelId
    portal.panel.setAttribute('role', 'dialog')
    portal.panel.tabIndex = -1
    portal.panel.addEventListener('pointerenter', this._onPanelPointerEnter)
    portal.panel.addEventListener('pointerleave', this._onPanelPointerLeave)
    portal.moveContent(
      Array.from(this.childNodes).filter(node => !(node instanceof HTMLElement && node.slot === 'trigger'))
    )
    return portal
  }

  private async _closeOverlay() {
    await this._panel.close(() => this.open)
  }

  private _reconfigureOverlay() {
    this._panel.reconfigure(this.open)
  }

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
    requestAnimationFrame(() => {
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
    if (e.target instanceof Node && this.portal && this._panel.getPanel()?.contains(e.target)) return
    if (this._isInsideShadowRoot(e)) return
    this._userOpenChange.mark()
    this.open = false
  }

  private _onFocusOut = () => {
    if (this.trigger === 'manual' || this.trigger === 'hover') return

    requestAnimationFrame(() => {
      if (this.open && !this.matches(':focus-within') && !this._panel.getPanel()?.matches(':focus-within')) {
        this._userOpenChange.mark()
        this.open = false
      }
    })
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (!this.open) return
    if (this.trigger === 'manual') return
    if (e.key === 'Escape') {
      this._userOpenChange.mark()
      this.open = false
      e.preventDefault()
    }
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
          class="popover-panel wui-glass wui-floating-panel"
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
