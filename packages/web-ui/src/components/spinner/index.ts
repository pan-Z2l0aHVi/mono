import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'

import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const LEAF_COUNT = 8

@customElement('web-ui-spinner')
export class WebUiSpinner extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Number, reflect: true }) size = 24
  @property({ type: String }) description = ''

  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => undefined,
    isConnected: () => this.isConnected
  })
  private _overlayHandle?: OpenOverlayHandle
  private readonly _scrollLock = defineScrollLockLease().make()

  // 自动创建并挂载全屏实例。
  static show(options?: { size?: number; duration?: number; description?: string }): WebUiSpinner {
    const el = document.createElement('web-ui-spinner')
    el._imperative = true
    if (options?.size) el.size = options.size
    if (options?.description) el.description = options.description
    document.body.appendChild(el)
    if (options?.duration && options.duration > 0) {
      el._timer = window.setTimeout(() => WebUiSpinner.hide(), options.duration)
    }
    return el
  }

  // 销毁由 show() 挂载的全屏实例。
  static hide() {
    const current = WebUiSpinner._current
    if (!current) return

    if (current._timer) {
      clearTimeout(current._timer)
      current._timer = undefined
    }
    current._closeDialog()
    current.remove()
    if (WebUiSpinner._current === current) WebUiSpinner._current = undefined
  }

  /** @internal 当前命令式实例 */
  static _current?: WebUiSpinner

  /** @internal */
  _imperative = false
  /** @internal */
  _timer?: ReturnType<typeof setTimeout>

  override connectedCallback() {
    super.connectedCallback()
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'status')
    }
    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Loading')
    }
    if (this._imperative) {
      if (WebUiSpinner._current !== this) WebUiSpinner._current?.remove()
      WebUiSpinner._current = this
      this.classList.add('wui-spinner-overlay')
      this._scrollLock.sync(true)
      this.requestUpdate()
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._closeDialog()
    this._overlayHandle?.release()
    this._overlayHandle = undefined
    this._scrollLock.release()
    if (this._timer) {
      clearTimeout(this._timer)
      this._timer = undefined
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    this._syncImperativeOverlay()
    if (props.has('size')) {
      this.style.setProperty('--wui-spinner-size', `${this.size}px`)
    }
  }

  private _syncImperativeOverlay() {
    if (!this._imperative || !this.isConnected) return
    const dialog = this.shadowRoot?.querySelector('dialog')
    if (!dialog || dialog.open) return

    if (typeof dialog.showModal === 'function') {
      dialog.showModal()
      this._overlayHandle = this._overlay.claim(dialog, { ancestryFrom: this })
    } else {
      dialog.setAttribute('open', '')
    }
  }

  private _handleDialogCancel(event: Event) {
    event.preventDefault()
  }

  private _closeDialog() {
    const dialog = this.shadowRoot?.querySelector('dialog')
    if (!dialog?.open) return
    if (typeof dialog.close === 'function') dialog.close()
    else dialog.removeAttribute('open')
  }

  override render() {
    const spinner = html`
      <div class="wui-spinner">
        ${repeat(
          Array.from({ length: LEAF_COUNT }, (_, i) => i),
          i =>
            html`<span
              style="transform:rotate(${i * 45}deg);animation-delay:calc(-${LEAF_COUNT - i} / ${LEAF_COUNT} * var(--wui-duration-spinner, 800ms))"
            ></span>`
        )}
      </div>
      ${this.description ? html`<div class="spinner-description">${this.description}</div>` : nothing}
      <slot name="description"></slot>
    `
    return this._imperative
      ? html`<dialog
          class="wui-spinner-overlay"
          aria-label=${this.getAttribute('aria-label')}
          aria-modal="true"
          @cancel=${this._handleDialogCancel}
        >
          <div class="wui-spinner-overlay-content" role="status" aria-label=${this.getAttribute('aria-label')}>
            ${spinner}
          </div>
        </dialog>`
      : spinner
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-spinner': WebUiSpinner
  }
}
