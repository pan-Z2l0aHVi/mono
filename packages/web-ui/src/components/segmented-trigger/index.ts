import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import style from './style.css?inline'

@customElement('web-ui-segmented-trigger')
export class WebUiSegmentedTrigger extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) checked = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @state() private _groupDisabled = false

  private get _isDisabled(): boolean {
    return this.disabled || this._groupDisabled
  }

  private get _isManagedByGroup(): boolean {
    return this.closest('web-ui-segmented') !== null
  }

  setGroupDisabled(disabled: boolean) {
    this._groupDisabled = disabled
  }

  private handleClick() {
    if (this._isDisabled || this.checked) return
    this.checked = true
    // group-managed 时事件不冒泡/不组合，由 segmented 统一派发一次 host 事件
    const opts: EventInit = this._isManagedByGroup
      ? { bubbles: false, composed: false }
      : { bubbles: true, composed: true }
    this.dispatchEvent(new Event('change', opts))
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      this.handleClick()
    }
  }

  override render() {
    const cls = {
      'wui-segmented-trigger': true,
      'is-checked': this.checked,
      'is-disabled': this._isDisabled
    }

    return html`
      <div
        class=${classMap(cls)}
        tabindex=${this._isDisabled ? '-1' : '0'}
        role="option"
        aria-selected=${String(this.checked)}
        aria-disabled=${String(this._isDisabled)}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <slot></slot>
      </div>
    `
  }

  declare readonly $events: {
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-segmented-trigger': WebUiSegmentedTrigger
  }
}
