import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { createOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'

import style from './style.css?inline'

let popoverIdCounter = 0

@customElement('web-ui-popover')
export class WebUiPopover extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: String, reflect: true }) placement: Placement = 'bottom'
  @property({ type: Number }) offset = 8
  @property({ type: String, reflect: true }) trigger: 'click' | 'hover' | 'manual' = 'click'
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _overlay?: OverlayApi & { anchor: HTMLElement; overlay: HTMLElement }
  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _suppressEvent = false
  private _portal?: OverlayPortal

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
    this.removeEventListener('mouseenter', this._onMouseEnter)
    this.removeEventListener('mouseleave', this._onMouseLeave)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    this._disposeOverlay()
  }

  override firstUpdated() {
    this._initLocalOverlay()
    if (this.open) requestAnimationFrame(() => this._openOverlay())
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('placement') || changed.has('portal') || changed.has('overlayContainer'))
      requestAnimationFrame(() => this._reconfigureOverlay())

    if (changed.has('open')) {
      if (this.open) {
        requestAnimationFrame(() => this._openOverlay())
        this._dispatchChange(true)
        this._focusPanel()
      } else {
        this._returnFocus()
        this._closeOverlay()
        if (!this._suppressEvent) this._dispatchChange(false)
      }
    }

    if (changed.has('trigger')) {
      this.removeEventListener('mouseenter', this._onMouseEnter)
      this.removeEventListener('mouseleave', this._onMouseLeave)
      clearTimeout(this._showTimer)
      clearTimeout(this._hideTimer)
      this._syncTriggerListeners()
    }
  }

  /* ========== Public API ========== */

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

  /* ========== Internal ========== */

  /** 通过 composedPath 检查点击是否发生在 shadow DOM 内部 */
  private _isInsideShadowRoot(e: MouseEvent): boolean {
    for (const node of e.composedPath()) {
      if (node instanceof Node && node.getRootNode() === this.shadowRoot) return true
    }
    return false
  }

  private _syncTriggerListeners() {
    if (this.trigger === 'hover') {
      this.addEventListener('mouseenter', this._onMouseEnter)
      this.addEventListener('mouseleave', this._onMouseLeave)
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

  private _openOverlay() {
    if (this.portal) this._openPortal()
    else this._overlay?.open()
  }

  private _openPortal() {
    if (this._portal) return
    const anchor = this.shadowRoot?.querySelector('.popover-trigger') as HTMLElement | null
    if (!anchor) return
    const portal = createOverlayPortal({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${style}`,
      className: 'popover-panel portal wui-glass'
    })
    portal.panel.id = this._panelId
    portal.panel.setAttribute('role', 'dialog')
    portal.panel.tabIndex = -1
    portal.panel.addEventListener('mouseenter', this._onPanelMouseEnter)
    portal.panel.addEventListener('mouseleave', this._onPanelMouseLeave)
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
  }

  private _closeOverlay() {
    this._overlay?.close()
    if (!this._portal) return
    this._portal?.restoreContent()
    this._portal?.remove()
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
    this._disposeOverlay()
    if (!this.portal) this._initLocalOverlay()
    if (this.open) this._openOverlay()
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

  /* ========== Event Handlers ========== */

  private _onTriggerClick = () => {
    if (this.disabled) return
    // 清除 hover 定时器，防止 click/hover 竞争
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    // hover 模式不响应点击切换，仅由 mouseenter/mouseleave 控制
    if (this.trigger === 'hover') return
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

  private _onMouseEnter = () => {
    if (this.disabled || this.trigger !== 'hover') return
    clearTimeout(this._hideTimer)
    this._showTimer = setTimeout(() => this.show(), 100)
  }

  private _onMouseLeave = () => {
    if (this.disabled || this.trigger !== 'hover') return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => this.close(), 100)
  }

  private _onPanelMouseEnter = () => {
    if (this.trigger !== 'hover') return
    clearTimeout(this._hideTimer)
  }

  private _onPanelMouseLeave = () => {
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
          class="popover-panel wui-glass"
          ?hidden=${!this.open}
          role="dialog"
          tabindex="-1"
          @mouseenter=${this._onPanelMouseEnter}
          @mouseleave=${this._onPanelMouseLeave}
        >
          <slot></slot>
        </div>
      </div>
    `
  }
}

export interface WebUiPopover {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
  open: boolean
  isOpen: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-popover': WebUiPopover
  }
}
