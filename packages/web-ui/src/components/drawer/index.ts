import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { oouiClose } from '@/icons'
import { normalizeLiteral } from '@/shared/normalize'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { createScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['right', 'left', 'top', 'bottom'] as const

export type DrawerPlacement = (typeof ALLOWED_PLACEMENTS)[number]

@customElement('web-ui-drawer')
export class WebUiDrawer extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'no-backdrop-close' }) noBackdropClose = false
  @property({ type: String, reflect: true })
  get placement(): DrawerPlacement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'right')
    this.requestUpdate('placement', old)
  }
  private _placement: DrawerPlacement = 'right'

  /** 标题文字（未传 header slot 时显示默认 header） */
  @property({ type: String }) heading = ''

  @property({ type: Boolean, reflect: true }) closable = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  private _hasHeaderSlot = false
  private _hasFooterSlot = false
  private readonly _scrollLock = createScrollLockLease()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this.open
  })

  override connectedCallback() {
    super.connectedCallback()
    this._hasHeaderSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'header')
    this._hasFooterSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'footer')
  }

  override firstUpdated() {
    this._checkSlotContent('footer')
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._presence.dispose()
    this._scrollLock.release()
  }

  private _checkSlotContent(name: string) {
    const slot = this.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
    if (!slot) return
    const has = slot.assignedNodes().length > 0
    if (name === 'footer' && has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  private handleHeaderSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasHeaderSlot) {
      this._hasHeaderSlot = has
      this.requestUpdate()
    }
  }

  private handleFooterSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      this.emitOpenChange()
      this._presence.sync(this.open)
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  private handleTransitionEnd(e: TransitionEvent) {
    this._presence.handleTransitionEnd(e)
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    this.close()
  }

  /** 打开抽屉（命令式） */
  show() {
    if (this.open) return
    this.open = true
  }

  /** 关闭抽屉（带动画） */
  close() {
    if (!this.open) return
    this.open = false
  }

  private handleCancel(e: Event) {
    // 保留 top layer 直到 CSS 过渡结束，避免原生关闭跳过退出动画。
    e.preventDefault()
    this.close()
  }

  private handleNativeClose() {
    if (!this.open) return

    // 原生关闭可绕过 cancel；同步受控状态，避免 show() 误判为已打开。
    this._presence.handleNativeClose()
    this.open = false
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (this.noBackdropClose) return
    this.close()
  }

  private emitOpenChange() {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open: this.open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  override render() {
    const showHeader = this._hasHeaderSlot || !!this.heading

    return html`
      <dialog
        @cancel=${this.handleCancel}
        @close=${this.handleNativeClose}
        @click=${this.handleBackdropClick}
        @keydown=${this.handleKeydown}
        @transitionend=${this.handleTransitionEnd}
      >
        <div class="wui-drawer-body wui-glass">
          ${showHeader
            ? html`
                <div class="wui-drawer-header">
                  <slot name="header" @slotchange=${this.handleHeaderSlotChange}>
                    ${this.heading ? html`<span class="wui-drawer-heading">${this.heading}</span>` : nothing}
                  </slot>
                </div>
              `
            : nothing}
          <div class="wui-drawer-content">
            <slot></slot>
          </div>
          <div class="wui-drawer-footer" ?hidden=${!this._hasFooterSlot}>
            <slot name="footer" @slotchange=${this.handleFooterSlotChange}></slot>
          </div>
        </div>
        ${this.closable
          ? html`
              <web-ui-button class="wui-drawer-close" @click=${this.close} aria-label="关闭" variant="secondary" icon>
                <web-ui-icon .icon=${oouiClose}></web-ui-icon>
              </web-ui-button>
            `
          : nothing}
      </dialog>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-drawer': WebUiDrawer
  }
}
