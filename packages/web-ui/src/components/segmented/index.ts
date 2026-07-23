import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'

import type { WebUiSegmentedTrigger } from '../segmented-trigger'

import style from './style.css?inline'

@customElement('web-ui-segmented')
export class WebUiSegmented extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) disabled = false

  private readonly childObserver = new MutationObserver(() => {
    this._syncPropsToChildren()
    requestAnimationFrame(() => this._updateIndicator())
  })

  private _syncPropsToChildren() {
    this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger').forEach(trigger => {
      trigger.checked = trigger.value === this.value
      trigger.disabled = this.disabled
    })
  }

  private _updateIndicator() {
    const triggers = this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')
    let left = 0
    let width = 0

    triggers.forEach(trigger => {
      if (trigger.value === this.value) {
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
    if (props.has('value') || props.has('disabled')) {
      this._syncPropsToChildren()
      requestAnimationFrame(() => this._updateIndicator())
    }
  }

  override connectedCallback() {
    super.connectedCallback()
    this.childObserver.observe(this, { childList: true })
    this.addEventListener('update:checked', this._handleTriggerChange as EventListener)
  }

  override firstUpdated() {
    this._syncPropsToChildren()
    requestAnimationFrame(() => this._updateIndicator())
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.childObserver.disconnect()
    this.removeEventListener('update:checked', this._handleTriggerChange as EventListener)
  }

  private _handleTriggerChange(e: CustomEvent<{ checked: boolean; value: string }>) {
    if (this.disabled) return
    const newValue = e.detail.value
    if (newValue === this.value) return

    this.value = newValue
    this.dispatchEvent(
      new CustomEvent('value-changed', {
        detail: { value: newValue },
        bubbles: true,
        composed: true
      })
    )
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  override render() {
    return html`
      <div class="wui-segmented">
        <span class="wui-segmented-indicator wui-glass wui-glass-no-after"></span>
        <slot></slot>
      </div>
    `
  }
}

export interface WebUiSegmented {
  readonly $events: {
    'value-changed': CustomEvent<{ value: string }>
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-segmented': WebUiSegmented
  }
}
