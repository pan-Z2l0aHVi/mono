import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import glass from '@/assets/glass.css?inline'

import type { WebUiSegmentedTrigger } from '../segmented-trigger'

import style from './style.css?inline'

@customElement('web-ui-segmented')
export class WebUiSegmented extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  static formAssociated = true

  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  private _internals?: ElementInternals
  @state() private _value = ''
  @state() private _formDisabled = false
  private _initialValue = ''

  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._internals?.setFormValue?.(v)
    this.requestUpdate('value', old)
  }

  private readonly childObserver = new MutationObserver(() => {
    this._syncPropsToChildren()
    requestAnimationFrame(() => this._updateIndicator())
  })

  private _syncPropsToChildren() {
    this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger').forEach(trigger => {
      trigger.checked = trigger.value === this._value
      trigger.setGroupDisabled(this._isDisabled)
    })
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formDisabled
  }

  private _updateIndicator() {
    const triggers = this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
    let left = 0
    let width = 0

    triggers.forEach(trigger => {
      if (trigger.value === this._value) {
        const triggerRect = trigger.getBoundingClientRect()
        const groupRect = this.getBoundingClientRect()
        left = triggerRect.left - groupRect.left
        width = triggerRect.width
      }
    })

    this.style.setProperty('--indicator-left', `${left}px`)
    this.style.setProperty('--indicator-width', `${width}px`)
  }

  override updated(props: PropertyValues) {
    if (props.has('value') || props.has('disabled') || props.has('_formDisabled')) {
      this._syncPropsToChildren()
      requestAnimationFrame(() => this._updateIndicator())
    }
  }

  override connectedCallback() {
    super.connectedCallback()
    this._internals = this.attachInternals()

    // 仅当属性在连接前未被 property setter 设值时，才从 attribute 读取初始值
    const attrValue = this.getAttribute('value')
    if (attrValue !== null && this._value === '') {
      this._value = attrValue
    }
    this._initialValue = attrValue ?? ''
    this._internals?.setFormValue?.(this._value)

    this.childObserver.observe(this, { childList: true })
    this.addEventListener('change', this._handleChildChange)
  }

  override firstUpdated() {
    this._syncPropsToChildren()
    requestAnimationFrame(() => this._updateIndicator())
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.childObserver.disconnect()
    this.removeEventListener('change', this._handleChildChange)
  }

  private _handleChildChange(e: Event) {
    if (this._isDisabled) return
    const target = e.target as HTMLElement
    if (!target.matches?.('web-ui-segmented-trigger')) return
    const trigger = target as WebUiSegmentedTrigger
    if (trigger.value === this._value) return

    this.value = trigger.value
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  formResetCallback() {
    this.value = this._initialValue
  }

  formDisabledCallback(disabled: boolean) {
    this._formDisabled = disabled
  }

  override render() {
    return html`
      <div
        class=${classMap({ 'wui-segmented': true, 'is-disabled': this._isDisabled })}
        role="listbox"
        aria-orientation="horizontal"
      >
        <span class="wui-segmented-indicator wui-glass"></span>
        <slot></slot>
      </div>
    `
  }

  declare readonly $events: {
    input: Event & { target: WebUiSegmented }
    change: Event & { target: WebUiSegmented }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-segmented': WebUiSegmented
  }
}
