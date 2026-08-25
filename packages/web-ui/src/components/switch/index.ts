import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'
import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'

import style from './style.css?inline'

@customElement('web-ui-switch')
export class WebUiSwitch extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  static formAssociated = true

  @state() private _checked = false

  get checked(): boolean {
    return this._checked
  }

  set checked(v: boolean) {
    const old = this._checked
    this._checked = v
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
  }

  @property({ type: String, reflect: true }) name = ''
  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false
  @property({ type: Boolean, reflect: true }) loading = false
  @state() private _pressed = false

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
  }

  private readonly _formAssociation = defineFormAssociation<boolean>({
    host: this,
    initialize: () => {
      if (this.hasAttribute('checked')) this._checked = true
    },
    getState: () => this._checked,
    setState: checked => {
      this.checked = checked
    },
    getFormValue: () => (this._checked ? this.value || 'on' : null),
    getFormState: () => String(this._checked),
    restoreState: state => {
      if (typeof state === 'string') this.checked = state === 'true'
    },
    syncValidity: () => this._syncValidity()
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  formResetCallback() {
    this._formAssociation.reset()
  }

  formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this._formAssociation.restore(state)
  }

  private _syncValidity() {
    const internals = this._formAssociation.getInternals()
    if (!internals || typeof internals.setValidity !== 'function') return
    if (this._isDisabled || !this.required || this._checked) internals.setValidity({})
    else internals.setValidity({ valueMissing: true }, '请启用此项')
  }

  // 用户点击切换开关状态，阻止 label 默认行为避免原生 checkbox 重复触发
  private handleClick(e: Event) {
    e.preventDefault()
    if (this._isDisabled || this.loading) return
    const old = this._checked
    this._checked = !old
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handlePointerDown() {
    if (this._isDisabled || this.loading) return
    this._pressed = true
  }

  private handlePointerUp() {
    this._pressed = false
  }

  private handlePointerLeave() {
    this._pressed = false
  }

  override render() {
    const trackCls = {
      'wui-switch-track': true,
      'is-open': this._checked,
      'is-disabled': this._isDisabled || this.loading
    }
    const thumbCls = {
      'wui-switch-thumb': true,
      'wui-glass': this._pressed,
      'is-pressed': this._pressed
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
          ${
            this.loading
              ? html`<div class="wui-switch-loading">
                  <web-ui-icon .icon=${lucideLoaderCircle} size="14" color="#08f" spin></web-ui-icon>
                </div>`
              : ''
          }
        </div>
      </label>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-switch': WebUiSwitch
  }
}
