import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'

import style from './style.css?inline'

@customElement('web-ui-switch')
export class WebUiSwitch extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) loading = false
  @state() private pressed = false

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (props.has('open')) {
      this.dispatchEvent(
        new CustomEvent('open-change', {
          detail: { open: this.open },
          bubbles: true,
          composed: true
        })
      )
    }
  }

  show() {
    if (this.open) return
    this.open = true
  }

  close() {
    if (!this.open) return
    this.open = false
  }

  private handleChange(e: Event) {
    this.open = (e.target as HTMLInputElement).checked
  }

  private handlePointerDown() {
    if (this.disabled || this.loading) return
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
      'is-open': this.open,
      'is-disabled': this.disabled || this.loading
    }
    const thumbCls = {
      'wui-switch-thumb': true,
      'wui-glass': this.pressed,
      'wui-glass-no-after': this.pressed,
      'is-pressed': this.pressed
    }

    return html`
      <label
        class=${classMap(trackCls)}
        role="switch"
        aria-checked=${String(this.open)}
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.handlePointerUp}
        @pointercancel=${this.handlePointerUp}
        @pointerleave=${this.handlePointerLeave}
      >
        <input
          type="checkbox"
          .checked=${this.open}
          ?disabled=${this.disabled || this.loading}
          class="sr-only"
          @change=${this.handleChange}
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
}

export interface WebUiSwitch {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-switch': WebUiSwitch
  }
}
