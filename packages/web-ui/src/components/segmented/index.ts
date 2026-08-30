import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import { defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp, snapToNearest } from '@/shared/gesture/physics'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'

import type { WebUiSegmentedTrigger } from '../segmented-trigger'

import style from './style.css?inline'

@customElement('web-ui-segmented')
export class WebUiSegmented extends LitElement {
  static override styles = unsafeCSS(style)
  static formAssociated = true

  @property({ type: String, reflect: true }) name = ''
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  @state() private _value = ''
  @state() private _indicatorReady = false
  @state() private _pressed = false
  @state() private _isDragging = false

  private _dragGestureHandle: DragGestureHandle | null = null

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = null
  }

  private readonly _groupController = new GroupController(
    this,
    defineGroupCoordinator<WebUiSegmentedTrigger, string>({
      host: this,
      getItems: () => [...this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')],
      getValue: () => this._value,
      setValue: value => {
        this.value = value
      },
      getDisabled: () => this._isDisabled,
      isItem: (target): target is WebUiSegmentedTrigger =>
        target instanceof HTMLElement && target.matches('web-ui-segmented-trigger'),
      isItemSelected: (trigger, value) => trigger.value === value,
      getNextValue: (trigger, value) => (trigger.checked ? trigger.value : value),
      valuesEqual: (a, b) => a === b,
      copyValue: value => value,
      setItemSelected: (trigger, selected) => {
        trigger.checked = selected
      },
      dispatchValueChange: () => {
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
      }
    }).make(),
    { afterSync: () => requestAnimationFrame(() => this._updateIndicator()) }
  )

  get value(): string {
    return this._value
  }

  set value(v: string) {
    const old = this._value
    this._value = v
    this._formAssociation.sync()
    this.requestUpdate('value', old)
  }

  private get _isDisabled(): boolean {
    return this.disabled || this._formAssociation.isFormDisabled()
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

    // 首帧只完成定位；若一开始就启用 left/width transition，indicator 会从 0 滑到初始选项。
    if (!this._indicatorReady) this._indicatorReady = true
  }

  private handlePointerDown(e: PointerEvent) {
    if (this._isDisabled) return
    const triggers = [...this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
    const enabledTriggers = triggers.filter(t => !t.disabled)
    if (enabledTriggers.length === 0) return

    // 必须按下当前选中的 trigger 才能启动指示器拖拽
    const activeTrigger = triggers.find(t => t.value === this._value)
    if (!activeTrigger || activeTrigger.disabled) return

    const activeTriggerRect = activeTrigger.getBoundingClientRect()
    const isPressedOnActive =
      e.clientX >= activeTriggerRect.left &&
      e.clientX <= activeTriggerRect.right &&
      e.clientY >= activeTriggerRect.top &&
      e.clientY <= activeTriggerRect.bottom

    if (!isPressedOnActive) return

    this._pressed = true

    const groupRect = this.getBoundingClientRect()
    const initialTriggerRect = activeTrigger.getBoundingClientRect()
    const initialLeft = initialTriggerRect.left - groupRect.left
    const initialWidth = initialTriggerRect.width

    const firstTriggerRect = triggers[0].getBoundingClientRect()
    const lastTriggerRect = triggers[triggers.length - 1].getBoundingClientRect()
    const minLeft = firstTriggerRect.left - groupRect.left
    const maxLeft = lastTriggerRect.right - groupRect.left - initialWidth

    const enabledCenters = enabledTriggers.map(t => {
      const r = t.getBoundingClientRect()
      return r.left - groupRect.left + r.width / 2
    })

    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = attachDragGesture(e, {
      axis: 'x',
      threshold: 6,
      onMove: info => {
        this._isDragging = true
        const currentLeft = clamp(initialLeft + info.deltaX, minLeft, maxLeft)
        this.style.setProperty('--indicator-left', `${currentLeft}px`)
        this.style.setProperty('--indicator-width', `${initialWidth}px`)
      },
      onEnd: info => {
        const wasDragging = this._isDragging
        this._isDragging = false
        this._pressed = false

        if (wasDragging) {
          const currentLeft = clamp(initialLeft + info.deltaX, minLeft, maxLeft)
          const currentCenter = currentLeft + initialWidth / 2

          let targetTrigger = activeTrigger
          if (info.velocityX > 300) {
            const currentIdx = enabledTriggers.indexOf(activeTrigger)
            if (currentIdx !== -1 && currentIdx < enabledTriggers.length - 1) {
              targetTrigger = enabledTriggers[currentIdx + 1]
            } else {
              targetTrigger = enabledTriggers[enabledTriggers.length - 1]
            }
          } else if (info.velocityX < -300) {
            const currentIdx = enabledTriggers.indexOf(activeTrigger)
            if (currentIdx > 0) {
              targetTrigger = enabledTriggers[currentIdx - 1]
            } else {
              targetTrigger = enabledTriggers[0]
            }
          } else {
            const nearestIdx = snapToNearest(currentCenter, enabledCenters)
            if (nearestIdx !== -1 && enabledTriggers[nearestIdx]) {
              targetTrigger = enabledTriggers[nearestIdx]
            }
          }

          if (targetTrigger.value !== this._value) {
            this.value = targetTrigger.value
            this._groupController.sync()
            this.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
            this.dispatchEvent(new Event('change', { bubbles: true, composed: true }))
          } else {
            this._updateIndicator()
          }
        }
        this.requestUpdate()
      },
      onCancel: () => {
        this._isDragging = false
        this._pressed = false
        this._updateIndicator()
        this.requestUpdate()
      }
    })
  }

  private handlePointerUp() {
    this._pressed = false
  }

  private handlePointerLeave() {
    if (!this._dragGestureHandle?.isDragging()) {
      this._pressed = false
    }
  }

  private readonly _formAssociation = defineFormAssociation<string>({
    host: this,
    initialize: () => {
      const attrValue = this.getAttribute('value')
      if (attrValue !== null && this._value === '') this._value = attrValue
    },
    getState: () => this._value,
    setState: value => {
      this.value = value
    },
    getFormValue: () => (this.name && this._value ? this._value : null),
    getFormState: () => this._value,
    restoreState: state => {
      if (typeof state === 'string') this.value = state
    }
  }).make()

  private readonly _formAssociationController = new FormAssociationController(this, this._formAssociation)

  formResetCallback() {
    this._formAssociation.reset()
  }

  formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    this._groupController.sync()
  }

  formStateRestoreCallback(state: string | File | FormData | null) {
    this._formAssociation.restore(state)
  }

  override render() {
    return html`
      <div
        class=${classMap({
          'wui-segmented': true,
          'is-disabled': this._isDisabled,
          'is-pressed': this._pressed,
          'is-dragging': this._isDragging,
          'is-indicator-ready': this._indicatorReady
        })}
        role="listbox"
        aria-orientation="horizontal"
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.handlePointerUp}
        @pointercancel=${this.handlePointerUp}
        @pointerleave=${this.handlePointerLeave}
      >
        <span class="wui-segmented-indicator"></span>
        <slot></slot>
      </div>
    `
  }

  declare readonly $events: {
    input: Event
    change: Event
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-segmented': WebUiSegmented
  }
}
