import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-switch')
export class WebUiSwitch extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  static formAssociated = true

  private _internals?: ElementInternals
  @state() private _formDisabled = false

  @state() private _checked = false

  get checked(): boolean {
    return this._checked
  }

  set checked(v: boolean) {
    const old = this._checked
    this._checked = v
    this._syncFormValue()
    this.requestUpdate('checked', old)
  }

  @property({ type: String, reflect: true }) name = ''
  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) loading = false
  @state() private pressed = false

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  override connectedCallback() {
    super.connectedCallback()
    if (this._internals) return
    this._internals = this.attachInternals()
    if (this.hasAttribute('checked')) {
      this._checked = true
    }
    this._syncFormValue()
  }

  formResetCallback() {
    this.checked = this.hasAttribute('checked')
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  override updated() {
    this._syncFormValue()
    if (!this._internals || typeof this._internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._checked) this._internals.setValidity({})
    else this._internals.setValidity({ valueMissing: true }, '请启用此项')
  }

  private _syncFormValue() {
    this._internals?.setFormValue?.(this._checked ? this.value || 'on' : null)
  }

  // 用户点击切换开关状态，阻止 label 默认行为避免原生 checkbox 重复触发
  private handleClick(e: Event) {
    e.preventDefault()
    if (this._isDisabled || this.loading) return
    const old = this._checked
    this._checked = !old
    this._syncFormValue()
    this.requestUpdate('checked', old)
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handlePointerDown() {
    if (this._isDisabled || this.loading) return
    this.pressed = true
  }

  private handlePointerUp() {
    this.pressed = false
  }

  private handlePointerLeave() {
    this.pressed = false
  }

  override render() {
    const trackCls = {
      'wui-switch-track': true,
      'is-open': this._checked,
      'is-disabled': this._isDisabled || this.loading
    }
    const thumbCls = {
      'wui-switch-thumb': true,
      'wui-glass': this.pressed,
      'is-pressed': this.pressed
    }

    return html`
      <label
        class=${classMap(trackCls)}
        role="switch"
        aria-checked=${String(this._checked)}
        @click=${this.handleClick}
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.handlePointerUp}
        @pointercancel=${this.handlePointerUp}
        @pointerleave=${this.handlePointerLeave}
      >
        <input
          type="checkbox"
          .checked=${this._checked}
          ?disabled=${this._isDisabled || this.loading}
          class="sr-only"
        />
        <div class=${classMap(thumbCls)}>
          ${this.loading
            ? html`<div class="wui-switch-loading">
                <web-ui-icon .icon=${lucideLoaderCircle} size="14" color="#08f" spin></web-ui-icon>
              </div>`
            : ''}
        </div>
      </label>
    `
  }

  declare readonly $events: {
    input: Event & { target: WebUiSwitch }
    change: Event & { target: WebUiSwitch }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-switch': WebUiSwitch
  }
}
