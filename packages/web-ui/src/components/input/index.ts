import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

// web-ui-icon 必须注册（Rolldown tree-shake 副作用 import，引用类名阻止删除）
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { jamCloseCircleF } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-input')
export class WebUiInput extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) type = 'text'
  @property({ type: String, reflect: true }) value = ''
  @property({ type: String, reflect: true }) placeholder = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) closable = false
  @property({ type: Boolean, reflect: true }) full = false

  @state() private _focused = false
  @state() private _hasPrefix = false
  @state() private _hasSuffix = false

  override updated(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      const input = this.shadowRoot?.querySelector('input')
      if (input && input.value !== this.value) {
        input.value = this.value
      }
    }
    this.toggleAttribute('focused', this._focused)
  }

  private _onSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement
    const hasContent = slot.assignedElements().length > 0
    if (slot.name === 'prefix') this._hasPrefix = hasContent
    if (slot.name === 'suffix') this._hasSuffix = hasContent
  }

  private handleInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value
  }

  private handleFocus() {
    if (!this.disabled) this._focused = true
  }

  private handleBlur() {
    this._focused = false
  }

  private handleClear() {
    this.value = ''
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }

  private preventMouseDownBlur(e: Event) {
    e.preventDefault()
  }

  private focusInput() {
    this.shadowRoot?.querySelector('input')?.focus()
  }

  override render() {
    const showClear = this.closable && this.value

    return html`
      <div class="wui-glass wui-glass-no-after wui-input-inner" @click=${this.focusInput}>
        <slot name="prefix" class=${classMap({ empty: !this._hasPrefix })} @slotchange=${this._onSlotChange}></slot>
        <input
          type=${this.type}
          placeholder=${this.placeholder}
          ?disabled=${this.disabled}
          .value=${this.value}
          @input=${this.handleInput}
          @focus=${this.handleFocus}
          @blur=${this.handleBlur}
        />
        ${showClear
          ? html`<span
              class="clear"
              @pointerdown=${this.preventMouseDownBlur}
              @mousedown=${this.preventMouseDownBlur}
              @click=${this.handleClear}
            >
              <web-ui-icon .icon=${jamCloseCircleF}></web-ui-icon>
            </span>`
          : ''}
        <slot name="suffix" class=${classMap({ empty: !this._hasSuffix })} @slotchange=${this._onSlotChange}></slot>
      </div>
    `
  }
}

export interface WebUiInput {
  readonly $events: {
    input: Event
    focus: FocusEvent
    blur: FocusEvent
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-input': WebUiInput
  }
}
