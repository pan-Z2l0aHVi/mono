import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { defineGroupManaged, type SelectionGroupContext } from '@/shared/group-management'

import style from './style.css?inline'

@customElement('web-ui-radio')
export class WebUiRadio extends LitElement {
  static override styles = unsafeCSS(style)
  static formAssociated = true

  private readonly _groupManagement = defineGroupManaged<SelectionGroupContext>(this, {
    requestUpdate: () => this.requestUpdate()
  }).make()

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

  @property({ type: String }) value = ''
  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  private get _isDisabled(): boolean {
    return (
      this.disabled || this._formAssociation.isFormDisabled() || this._groupManagement.getContext()?.disabled === true
    )
  }

  private get _isManagedByGroup(): boolean {
    return this._groupManagement.getContext() !== undefined
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
    getFormValue: () => (!this._isManagedByGroup && this._checked ? this.value || 'on' : null),
    getFormState: () => String(this._checked),
    restoreState: state => {
      if (typeof state === 'string') this.checked = state === 'true'
    },
    isStateManaged: () => this._isManagedByGroup,
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
    if (this._isDisabled || this._isManagedByGroup || !this.required || this._checked) {
      internals.setValidity({})
      return
    }
    internals.setValidity({ valueMissing: true }, '请选择一项')
  }

  private handleClick() {
    if (this._isDisabled || this._checked) return
    this._checked = true
    this._formAssociation.sync()
    this.requestUpdate('checked', false)
    // group-managed 时事件不冒泡/不组合，由 group 统一派发一次 host 事件
    const opts: EventInit = this._isManagedByGroup
      ? { bubbles: false, composed: false }
      : { bubbles: true, composed: true }
    this.dispatchEvent(new Event('input', opts))
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
      'wui-radio': true,
      'is-checked': this._checked,
      'is-disabled': this._isDisabled
    }

    return html`
      <label
        class=${classMap(cls)}
        tabindex=${this._isDisabled ? '-1' : '0'}
        role="radio"
        aria-checked=${String(this._checked)}
        aria-disabled=${String(this._isDisabled)}
        @click=${this.handleClick}
        @keydown=${this.handleKeyDown}
      >
        <span class="wui-radio-circle">
          <span class="wui-radio-dot"></span>
        </span>
        <span class="wui-radio-label"><slot></slot></span>
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
    'web-ui-radio': WebUiRadio
  }
}
