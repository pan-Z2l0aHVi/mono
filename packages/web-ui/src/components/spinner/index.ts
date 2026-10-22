import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { repeat } from 'lit/directives/repeat.js'
import { styleMap } from 'lit/directives/style-map.js'

import type { WebUiTheme } from '@/components/theme'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { getFallbackOverlayRoot } from '@/shared/overlay/overlay-root'
import { findRootTheme } from '@/shared/overlay/theme-overlay-scope'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const LEAF_COUNT = 8

type SpinnerMountTarget = {
  element: HTMLElement
  initializingTheme?: WebUiTheme
}

function getSpinnerMountTarget(): SpinnerMountTarget {
  const rootTheme = findRootTheme()
  const overlayRoot = rootTheme?.getOverlayRoot()
  if (overlayRoot) return { element: overlayRoot }

  const initializingTheme = Array.from(document.querySelectorAll<WebUiTheme>('web-ui-theme')).find(
    theme => theme.appearance !== undefined
  )
  return initializingTheme ? { element: initializingTheme, initializingTheme } : { element: getFallbackOverlayRoot() }
}

@customElement('web-ui-spinner')
export class WebUiSpinner extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Number, reflect: true }) size = 24
  @property({ type: String }) description = ''
  /** 叶片颜色；空字符串时跟随主题次要文本色。 */
  @property({ type: String }) color = ''
  @property({ type: String, attribute: 'aria-label' }) private _ariaLabel?: string

  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => undefined,
    isConnected: () => this.isConnected
  })
  private _overlayHandle?: OpenOverlayHandle
  private readonly _scrollLock = defineScrollLockLease().make()

  /**
   * 显示一个全屏加载实例并挂载到主题 overlay root（无主题时挂载到 fallback overlay root）；新实例会替换之前由此方法创建的实例。
   * @param options 尺寸、说明文字、颜色与可选自动关闭时长。
   * @returns 已挂载的 spinner 实例。
   */
  static show(options?: { size?: number; duration?: number; description?: string; color?: string }): WebUiSpinner {
    const el = document.createElement('web-ui-spinner')
    el._imperative = true
    if (options?.size) el.size = options.size
    if (options?.description) el.description = options.description
    if (options?.color !== undefined) el.color = options.color
    const mountTarget = getSpinnerMountTarget()
    mountTarget.element.appendChild(el)
    if (mountTarget.initializingTheme) {
      const theme = mountTarget.initializingTheme
      const moveIntoOverlayRoot = () => {
        const overlayRoot = theme.getOverlayRoot()
        if (overlayRoot && theme.isConnected && el.parentElement === theme) overlayRoot.appendChild(el)
      }
      void theme.updateComplete.then(
        () => {
          moveIntoOverlayRoot()
          if (el.parentElement === theme) window.requestAnimationFrame(moveIntoOverlayRoot)
        },
        () => undefined
      )
    }
    if (options?.duration && options.duration > 0) {
      el._timer = window.setTimeout(() => WebUiSpinner.hide(), options.duration)
    }
    return el
  }

  // 销毁由 show() 挂载的实例。
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
      if (WebUiSpinner._current && WebUiSpinner._current !== this) WebUiSpinner._current.remove()
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
      const timer = this._timer
      queueMicrotask(() => {
        if (this.isConnected || this._timer !== timer) return
        clearTimeout(timer)
        this._timer = undefined
      })
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
      <div class="wui-spinner" style=${styleMap({ color: this.color || undefined })}>
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
          aria-label=${this._ariaLabel}
          aria-modal="true"
          @cancel=${this._handleDialogCancel}
        >
          <div class="wui-spinner-overlay-content" role="status" aria-label=${this._ariaLabel}>${spinner}</div>
        </dialog>`
      : spinner
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-spinner': WebUiSpinner
  }
}
