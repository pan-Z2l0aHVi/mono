import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

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

  private _overlay?: OverlayApi & { anchor: HTMLElement; overlay: HTMLElement }
  private _showTimer?: ReturnType<typeof setTimeout>
  private _hideTimer?: ReturnType<typeof setTimeout>
  private _suppressEvent = false

  private _panelId = `wui-popover-panel-${++popoverIdCounter}`

  /** 当前是否打开 */
  get isOpen(): boolean {
    return this.open
  }

  override connectedCallback() {
    super.connectedCallback()
    document.addEventListener('click', this._onClickOutside)
    document.addEventListener('keydown', this._onKeydown)
    this._syncTriggerListeners()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('click', this._onClickOutside)
    document.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('mouseenter', this._onMouseEnter)
    this.removeEventListener('mouseleave', this._onMouseLeave)
    clearTimeout(this._showTimer)
    clearTimeout(this._hideTimer)
    this._overlay?.dispose()
  }

  override firstUpdated() {
    this._initOverlay()
    if (this.open) {
      requestAnimationFrame(() => this._overlay?.open())
    }
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('placement') && this._overlay) {
      this._overlay.dispose()
      requestAnimationFrame(() => {
        this._initOverlay()
        if (this.open) this._overlay?.open()
      })
    }

    if (changed.has('open')) {
      if (this.open) {
        lockScroll()
        requestAnimationFrame(() => this._overlay?.open())
        this._dispatchChange(true)
        this._focusPanel()
      } else {
        unlockScroll()
        this._overlay?.close()
        if (!this._suppressEvent) this._dispatchChange(false)
        this._returnFocus()
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

  private _initOverlay() {
    const panel = this.shadowRoot?.querySelector('.popover-panel') as HTMLElement | null
    if (panel) {
      this._overlay = withOverlay.make({
        anchor: this,
        overlay: panel,
        placement: this.placement,
        offset: this.offset
      })
    }
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
      const panel = this.shadowRoot?.querySelector('.popover-panel') as HTMLElement | null
      panel?.focus()
    })
  }

  private _returnFocus() {
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
    if (this._isInsideShadowRoot(e)) return
    this.open = false
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
        class="popover-panel wui-glass wui-glass-no-after"
        ?hidden=${!this.open}
        role="dialog"
        tabindex="-1"
        @mouseenter=${this._onPanelMouseEnter}
        @mouseleave=${this._onPanelMouseLeave}
      >
        <slot></slot>
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
