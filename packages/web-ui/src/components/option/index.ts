import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import { heroiconsCheck16Solid } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-option')
export class WebUiOption extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String, reflect: true }) value = ''
  @property({ type: String })
  get label(): string {
    return this._label || this._getSlottedLabel()
  }
  set label(value: string) {
    const old = this.label
    this._label = value
    this.requestUpdate('label', old)
  }
  private _label = ''
  private _slottedLabel = ''

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) selected = false

  override connectedCallback() {
    super.connectedCallback()
    this.dispatchEvent(
      new CustomEvent('option-register', {
        bubbles: true,
        composed: true,
        detail: { value: this.value, label: this.label, disabled: this.disabled }
      })
    )
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.dispatchEvent(
      new CustomEvent('option-unregister', {
        bubbles: true,
        composed: true,
        detail: { value: this.value }
      })
    )
  }

  override updated(changed: PropertyValues) {
    if (changed.has('value') || changed.has('label') || changed.has('disabled')) {
      this.dispatchEvent(
        new CustomEvent('option-update', {
          bubbles: true,
          composed: true
        })
      )
    }
  }

  private _onLabelSlotChange = () => {
    const label = this._getSlottedLabel()
    if (label === this._slottedLabel) return

    const old = this._label || this._slottedLabel
    this._slottedLabel = label
    this.requestUpdate('label', old)
  }

  private _getSlottedLabel(): string {
    return [...this.childNodes]
      .filter(node => !(node instanceof HTMLElement && node.slot))
      .map(node => node.textContent)
      .join('')
      .trim()
  }

  override render() {
    return html`
      <div class="option-label">
        <web-ui-icon class="check" size="16" .icon=${heroiconsCheck16Solid}></web-ui-icon>
        <slot name="prefix"></slot>
        <span class="content-wrap">${this._label || html`<slot @slotchange=${this._onLabelSlotChange}></slot>`}</span>
        <slot name="suffix"></slot>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-option': WebUiOption
  }
}
