import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import overlayMotion from '@/assets/overlay-motion.css?inline'
import { UserChangeController } from '@/shared/events/user-change'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { defineAnchoredPanel } from '@/shared/overlay/anchored-panel'
import { createOverlayPortal } from '@/shared/overlay/portal'
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

let visibleTooltipCount = 0

@customElement('web-ui-tooltip')
export class WebUiTooltip extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(overlayMotion), unsafeCSS(style)]

  @property({ type: String, reflect: true })
  get placement(): Placement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'top')
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
  private readonly _panel = defineAnchoredPanel().make({
    getAnchor: () => this.shadowRoot?.querySelector<HTMLElement>('.tooltip-trigger') ?? null,
    getLocalPanel: () => this.shadowRoot?.querySelector<HTMLElement>('.tooltip-panel') ?? null,
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
    this._syncVisibleTooltipCount(false)
    this._panel.dispose()
  }

  override firstUpdated() {
    if (this.open) {
      this._openOverlay(this._shouldOpenInstantly)
      this._shouldOpenInstantly = true
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('portal') || changed.has('overlayContainer')) {
      requestAnimationFrame(() => this._reconfigureOverlay())
    } else if (changed.has('placement') || changed.has('offset'))
      requestAnimationFrame(() => this._panel.updatePosition())

    if (changed.has('open')) {
      this._syncVisibleTooltipCount(this.open)
      if (this.open) {
        this._openOverlay(this._shouldOpenInstantly)
        this._shouldOpenInstantly = true
      } else {
        void this._closeOverlay()
      }
      if (this._userOpenChange.consume()) this._dispatchChange(this.open)
    }
    if (changed.has('content')) this._syncPortalContent()
  }

  private _onPointerEnter = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled) return
    clearTimeout(this._hideTimer)
    this._showTimer = setTimeout(() => this._show(), visibleTooltipCount > 0 ? 0 : this.showDelay)
  }

  private _onPointerLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return
    if (this.disabled) return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => this._hide(), this.hideDelay)
  }

  private _onFocusIn = () => {
    if (this.disabled) return
    clearTimeout(this._hideTimer)
    this._show(true)
  }

  private _onFocusOut = () => {
    if (this.disabled) return
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
    const portal = createOverlayPortal({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${overlayMotion}\n${style}`,
      className: 'tooltip-panel portal wui-glass wui-floating-panel'
    })
    if (this.content) {
      const text = document.createElement('span')
      text.className = 'tooltip-text'
      text.textContent = this.content
      portal.panel.append(text)
    } else portal.moveContent(Array.from(this.querySelectorAll('[slot="content"]')))
    portal.panel.setAttribute('role', 'tooltip')
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
    const panel = this._panel.getPanel()
    if (!panel) return
    const text = panel.querySelector<HTMLElement>('.tooltip-text')
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
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
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
        <div class="tooltip-trigger"><slot></slot></div>
        <div class="tooltip-panel wui-glass wui-floating-panel" hidden role="tooltip">
          ${this.content ? html`<span class="tooltip-text">${this.content}</span>` : html`<slot name="content"></slot>`}
        </div>
      </div>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }> & { target: WebUiTooltip }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-tooltip': WebUiTooltip
  }
}
