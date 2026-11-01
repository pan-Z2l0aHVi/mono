import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { ifDefined } from 'lit/directives/if-defined.js'

import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { defineGroupManaged, selectionGroupContextKey, type SelectionGroupContext } from '@/shared/group-management'

import style from './style.css?inline'

installPointerFocusSuppression()

@customElement('web-ui-segmented-trigger')
export class WebUiSegmentedTrigger extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: String }) value = ''
  @property({ type: Boolean, reflect: true }) checked = false
  @property({ type: Boolean, reflect: true }) disabled = false
  /** 纯图标 trigger 的可访问名；会转发到内部 `role="option"`。 */
  @property({ type: String, attribute: 'aria-label' }) override ariaLabel: string | null = null

  private readonly _groupManagement = defineGroupManaged<SelectionGroupContext>(this, {
    context: selectionGroupContextKey,
    requestUpdate: () => this.requestUpdate(),
    equals: (a, b) => a?.disabled === b?.disabled && a?.tabStop === b?.tabStop
  }).make()

  private get _isDisabled(): boolean {
    return this.disabled || this._groupManagement.getContext()?.disabled === true
  }

  private get _isManagedByGroup(): boolean {
    return this._groupManagement.getContext() !== undefined
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
        tabindex=${this._isDisabled || this._groupManagement.getContext()?.tabStop === false ? '-1' : '0'}
        role="option"
        aria-label=${ifDefined(this.ariaLabel ?? undefined)}
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
