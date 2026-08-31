import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideLoaderCircle } from '@/icons'
import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp, normalizeProgress } from '@/shared/gesture/physics'

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
  @state() private _isDragging = false
  @state() private _dragOffset = 0
  @state() private _dragProgress = 0

  private _dragged = false
  private _maxTravel = 24
  private _startOffset = 0
  private _dragGestureHandle: DragGestureHandle | null = null

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = null
  }

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

  // 阻止 label 默认行为，避免原生 checkbox 重复触发点击。
  private handleClick(e: Event) {
    e.preventDefault()
    if (this._dragged) {
      this._dragged = false
      return
    }
    if (this._isDisabled || this.loading) return
    const old = this._checked
    this._checked = !old
    this._formAssociation.sync()
    this.requestUpdate('checked', old)
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
  }

  private handlePointerDown(e: PointerEvent) {
    if (this._isDisabled || this.loading) return
    this._pressed = true

    const track = this.renderRoot.querySelector<HTMLElement>('.wui-switch-track')
    if (track) {
      const trackWidth = track.getBoundingClientRect().width || 48
      // 胶囊压感宽度为 32px，因此拖拽行程为 trackWidth - 4 - 32 = 12px
      this._maxTravel = Math.max(1, trackWidth - 4 - 32)
    } else {
      this._maxTravel = 12
    }

    this._startOffset = this._checked ? this._maxTravel : 0
    this._dragOffset = this._startOffset
    this._dragProgress = this._checked ? 1 : 0

    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = attachDragGesture(e, {
      axis: 'x',
      threshold: 6,
      onMove: info => {
        this._isDragging = true
        const current = clamp(this._startOffset + info.deltaX, 0, this._maxTravel)
        this._dragOffset = current
        this._dragProgress = normalizeProgress(current, 0, this._maxTravel)
        this.requestUpdate()
      },
      onEnd: info => {
        const wasDragging = this._isDragging
        this._isDragging = false
        this._pressed = false

        if (wasDragging) {
          this._dragged = true
          let targetChecked = this._checked
          if (info.velocityX > 300) {
            targetChecked = true
          } else if (info.velocityX < -300) {
            targetChecked = false
          } else {
            targetChecked = this._dragProgress >= 0.5
          }

          if (targetChecked !== this._checked) {
            const old = this._checked
            this._checked = targetChecked
            this._formAssociation.sync()
            this.requestUpdate('checked', old)
            this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
          } else {
            this.requestUpdate()
          }
        }
      },
      onCancel: () => {
        this._isDragging = false
        this._pressed = false
        this.requestUpdate()
      }
    })
  }

  private handlePointerUp() {
    this._pressed = false
  }

  private handlePointerLeave() {
    if (!this._isDragging) {
      this._pressed = false
    }
  }

  override render() {
    const isOpen = this._isDragging ? this._dragProgress >= 0.5 : this._checked
    const trackCls = {
      'wui-switch-track': true,
      'is-open': isOpen,
      'is-dragging': this._isDragging,
      'is-disabled': this._isDisabled || this.loading
    }
    const thumbCls = {
      'wui-switch-thumb': true,
      'wui-glass': this._pressed || this._isDragging,
      'is-pressed': this._pressed || this._isDragging
    }
    const trackStyle = this._isDragging ? { '--wui-switch-drag-offset': `${this._dragOffset}px` } : {}

    return html`
      <label
        class=${classMap(trackCls)}
        style=${styleMap(trackStyle)}
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
