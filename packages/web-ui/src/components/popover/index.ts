import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { createOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'

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

  private _overlay?: OverlayApi & { anchor: HTMLElement; overlay: HTMLElement }
  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _suppressEvent = false
  private _portal?: OverlayPortal
  private _shouldOpenInstantly = true

  private _panelId = `wui-popover-panel-${++popoverIdCounter}`

  /** 当前是否打开 */
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

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._onClickOutside)
    document.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('focusout', this._onFocusOut)
    this.removeEventListener('pointerenter', this._onPointerEnter)
    this.removeEventListener('pointerleave', this._onPointerLeave)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    this._disposeOverlay()
  }

  override firstUpdated() {
    this._initLocalOverlay()
    if (this.open) {
      requestAnimationFrame(() => this._openOverlay(this._shouldOpenInstantly))
      this._shouldOpenInstantly = true
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('placement') || changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())

    if (changed.has('open')) {
      if (this.open) {
        const isInstant = this._shouldOpenInstantly
        this._shouldOpenInstantly = true
        requestAnimationFrame(() => this._openOverlay(isInstant))
        this._dispatchChange(true)
        this._focusPanel()
      } else {
        this._returnFocus()
        void this._closeOverlay()
        if (!this._suppressEvent) this._dispatchChange(false)
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

  /** 打开 popover */
  show() {
    if (this.disabled || this.open) return
    this._suppressEvent = true
    this.open = true
    this._suppressEvent = false
  }

  /** 关闭 popover */
  close() {
    if (!this.open) return
    this._suppressEvent = true
    this.open = false
    this._suppressEvent = false
  }

  /** 切换 popover */
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

  private _initLocalOverlay() {
    const anchor = this.shadowRoot?.querySelector<HTMLElement>('.popover-trigger')
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (!anchor || !panel) return
    this._overlay = withOverlay.make({
      anchor,
      overlay: panel,
      placement: this.placement,
      offset: this.offset
    })
  }

  private _openOverlay(isInstant = false) {
    if (this.portal) this._openPortal(isInstant)
    else {
      this._overlay?.open()
      const panel = this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
      if (panel) showOverlayPresence(panel, { isInstant })
    }
  }

  private _openPortal(isInstant = false) {
    if (this._portal) {
      this._overlay?.open()
      showOverlayPresence(this._portal.panel, { isInstant })
      return
    }
    const anchor = this.shadowRoot?.querySelector('.popover-trigger') as HTMLElement | null
    if (!anchor) return
    const portal = createOverlayPortal({
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
    this._portal = portal
    this._overlay = withOverlay.make({
      anchor,
      overlay: portal.panel,
      placement: this.placement,
      offset: this.offset,
      strategy: 'fixed'
    })
    this._overlay.open()
    showOverlayPresence(portal.panel, { isInstant })
  }

  private async _closeOverlay() {
    this._overlay?.close()
    const panel = this._portal?.panel ?? this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    if (panel && !(await hideOverlayPresence(panel))) return
    if (!this._portal || this.open) return
    this._portal.restoreContent()
    this._portal.remove()
    this._portal = undefined
    this._overlay = undefined
  }

  private _disposeOverlay() {
    this._overlay?.dispose()
    this._overlay = undefined
    this._portal?.restoreContent()
    this._portal?.remove()
    this._portal = undefined
  }

  private _reconfigureOverlay() {
    const panel = this._portal?.panel ?? this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
    const shouldAnimate = panel?.dataset.wuiPresence === 'entering'
    this._disposeOverlay()
    if (!this.portal) this._initLocalOverlay()
    // 已稳定显示的面板重新定位不应重播动效；正在入场的指针交互则保持原有动效。
    if (this.open) this._openOverlay(!shouldAnimate)
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

  private _focusPanel() {
    requestAnimationFrame(() => {
      const panel = this._portal?.panel ?? this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
      const autofocus = panel?.querySelector<HTMLElement>('[autofocus]')
      if (autofocus && !autofocus.matches(':disabled, [disabled]')) autofocus.focus()
    })
  }

  private _returnFocus() {
    const panel = this._portal?.panel ?? this.shadowRoot?.querySelector<HTMLElement>('.popover-panel')
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
    this.toggle()
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this.open) return
    if (this.trigger === 'manual' || this.trigger === 'hover') return
    if (e.target instanceof Node && this._portal?.panel.contains(e.target)) return
    if (this._isInsideShadowRoot(e)) return
    this.open = false
  }

  private _onFocusOut = () => {
    if (this.trigger === 'manual' || this.trigger === 'hover') return

    requestAnimationFrame(() => {
      if (this.open && !this.matches(':focus-within') && !this._portal?.panel.matches(':focus-within')) {
        this.open = false
      }
    })
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (!this.open) return
    if (this.trigger === 'manual') return
    if (e.key === 'Escape') {
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
      this.show()
    }, 100)
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled || this.trigger !== 'hover') return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => this.close(), 100)
  }

  private _onPanelPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.trigger !== 'hover') return
    clearTimeout(this._hideTimer)
  }

  private _onPanelPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.trigger !== 'hover') return
    this._hideTimer = setTimeout(() => this.close(), 100)
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
