import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'

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

  private _overlay?: OverlayApi & { anchor: HTMLElement; overlay: HTMLElement }
  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _isVisible = false

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
    this._overlay?.dispose()
  }

  override firstUpdated() {
    const panel = this.shadowRoot?.querySelector('.tooltip-panel') as HTMLElement | null
    if (panel) {
      this._overlay = withOverlay.make({
        anchor: this,
        overlay: panel,
        placement: this.placement,
        offset: this.offset
      })
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('placement') && this._overlay) {
      this._overlay.dispose()
      const panel = this.shadowRoot?.querySelector('.tooltip-panel') as HTMLElement | null
      if (panel) {
        this._overlay = withOverlay.make({
          anchor: this,
          overlay: panel,
          placement: this.placement,
          offset: this.offset
        })
        if (this._isVisible) this._overlay.open()
      }
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
    this._overlay?.open()
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
    this._overlay?.close()
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: false },
        bubbles: true,
        composed: true
      })
    )
  }

  override render() {
    return html`
      <div class="tooltip-trigger">
        <slot></slot>
      </div>
      <div class="tooltip-panel${this._isVisible ? '' : ' hidden'}" role="tooltip">
        ${this.content ? html`<span class="tooltip-text">${this.content}</span>` : html`<slot name="content"></slot>`}
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
