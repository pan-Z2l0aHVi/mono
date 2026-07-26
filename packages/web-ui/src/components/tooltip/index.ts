import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { createOverlayPortal } from '@/shared/overlay/portal'
import type { OverlayContainer, OverlayPortal } from '@/shared/overlay/portal'

import style from './style.css?inline'

@customElement('web-ui-tooltip')
export class WebUiTooltip extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placement: Placement = 'top'

  @property({ type: Number, attribute: 'show-delay' }) showDelay = 200

  @property({ type: Number, attribute: 'hide-delay' }) hideDelay = 100

  @property({ type: Boolean, reflect: true }) disabled = false

  @property({ type: Number }) offset = 6

  @property({ type: String }) content = ''

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) portal = false
  @property({ attribute: false }) overlayContainer?: OverlayContainer

  private _overlay?: OverlayApi & { anchor: HTMLElement; overlay: HTMLElement }
  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _isVisible = false
  private _portal?: OverlayPortal

  get isOpen(): boolean {
    return this._isVisible
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('mouseenter', this._onMouseEnter)
    this.addEventListener('mouseleave', this._onMouseLeave)
    this.addEventListener('focusin', this._onFocusIn)
    this.addEventListener('focusout', this._onFocusOut)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('mouseenter', this._onMouseEnter)
    this.removeEventListener('mouseleave', this._onMouseLeave)
    this.removeEventListener('focusin', this._onFocusIn)
    this.removeEventListener('focusout', this._onFocusOut)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    this._disposeOverlay()
  }

  override firstUpdated() {
    this._initLocalOverlay()
    if (this._isVisible) requestAnimationFrame(() => this._openOverlay())
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('placement') || changed.has('portal') || changed.has('overlayContainer')) {
      requestAnimationFrame(() => this._reconfigureOverlay())
    }
  }

  private _onMouseEnter = () => {
    if (this.disabled) return
    clearTimeout(this._hideTimer)
    this._showTimer = setTimeout(() => this._show(), this.showDelay)
  }

  private _onMouseLeave = () => {
    if (this.disabled) return
    clearTimeout(this._showTimer)
    this._hideTimer = setTimeout(() => this._hide(), this.hideDelay)
  }

  private _onFocusIn = () => {
    if (this.disabled) return
    clearTimeout(this._hideTimer)
    this._show()
  }

  private _onFocusOut = () => {
    if (this.disabled) return
    clearTimeout(this._showTimer)
    this._hide()
  }

  private _show() {
    if (this._isVisible) return
    this._isVisible = true
    this.open = true
    this._openOverlay()
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: true },
        bubbles: true,
        composed: true
      })
    )
  }

  private _hide() {
    if (!this._isVisible) return
    this._isVisible = false
    this.open = false
    this._closeOverlay()
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: false },
        bubbles: true,
        composed: true
      })
    )
  }

  private _initLocalOverlay() {
    const anchor = this.shadowRoot?.querySelector<HTMLElement>('.tooltip-trigger')
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.tooltip-panel')
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
    const anchor = this.shadowRoot?.querySelector('.tooltip-trigger') as HTMLElement | null
    if (!anchor) return
    const portal = createOverlayPortal({
      container: this.overlayContainer,
      target: this,
      style: `${glass}\n${style}`,
      className: 'tooltip-panel portal wui-glass'
    })
    if (this.content) {
      const text = document.createElement('span')
      text.className = 'tooltip-text'
      text.textContent = this.content
      portal.panel.append(text)
    } else portal.moveContent(Array.from(this.querySelectorAll('[slot="content"]')))
    portal.panel.setAttribute('role', 'tooltip')
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
    if (this._isVisible) this._openOverlay()
  }

  override render() {
    return html`
      <div class="tooltip-anchor">
        <div class="tooltip-trigger"><slot></slot></div>
        <div class="tooltip-panel wui-glass" ?hidden=${!this._isVisible} role="tooltip">
          ${this.content ? html`<span class="tooltip-text">${this.content}</span>` : html`<slot name="content"></slot>`}
        </div>
      </div>
    `
  }
}

export interface WebUiTooltip {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
  isOpen: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-tooltip': WebUiTooltip
  }
}
