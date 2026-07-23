import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { lucideX } from '@/icons'

import style from './style.css?inline'

const CLOSE_DURATION = 300 // 与 CSS animation duration 一致

export type DrawerPlacement = 'right' | 'left' | 'top' | 'bottom'

@customElement('web-ui-drawer')
export class WebUiDrawer extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false

  @property({ reflect: true }) placement: DrawerPlacement = 'right'

  /** 标题文字（未传 header slot 时显示默认 header） */
  @property({ type: String }) heading = ''

  @property({ type: Boolean, reflect: true }) closable = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') as HTMLDialogElement | null
  }

  private _animating = false
  private _closeTimer: ReturnType<typeof setTimeout> | null = null
  private _hasHeaderSlot = false
  private _hasFooterSlot = false

  override connectedCallback() {
    super.connectedCallback()
    this._hasHeaderSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'header')
    this._hasFooterSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'footer')
  }

  override firstUpdated() {
    this._checkSlotContent('footer')
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
    if (props.has('open')) {
      this.emitOpenChange()
      if (this.open) {
        this._animating = false
        if (this._closeTimer) {
          clearTimeout(this._closeTimer)
          this._closeTimer = null
        }
        this.dialog?.showModal?.()
        document.body.style.overflow = 'hidden'
      } else if (!this._animating) {
        // 命令式（close()）和声明式（open=false）统一走动画关闭
        this._animating = true
        this.dialog?.classList.add('closing')
        this._closeTimer = setTimeout(() => {
          this.dialog?.close?.()
          this.dialog?.classList.remove('closing')
          this._animating = false
          this._closeTimer = null
          document.body.style.overflow = ''
        }, CLOSE_DURATION)
      }
    }
  }

  /** 打开抽屉（命令式） */
  show() {
    if (this.open) return
    this.open = true
  }

  /** 关闭抽屉（带动画） */
  close() {
    if (!this.open || this._animating) return
    this.open = false
  }

  private handleCancel(e: Event) {
    e.preventDefault()
    this.close()
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
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

  override render() {
    const showHeader = this._hasHeaderSlot || !!this.heading

    return html`
      <dialog @cancel=${this.handleCancel} @click=${this.handleBackdropClick}>
        <div class="wui-drawer-body wui-glass wui-glass-no-after">
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
              <web-ui-button class="wui-drawer-close" @click=${this.close} aria-label="关闭" icon>
                <web-ui-icon .icon=${lucideX} size="16"></web-ui-icon>
              </web-ui-button>
            `
          : nothing}
      </dialog>
    `
  }
}

export interface WebUiDrawer {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-drawer': WebUiDrawer
  }
}
