import { html, LitElement, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import glass from '@/assets/glass.css?inline'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp, snapToNearest } from '@/shared/gesture/physics'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'

import type { WebUiSegmentedTrigger } from '../segmented-trigger'

import style from './style.css?inline'

installPointerFocusSuppression()

const ALLOWED_VARIANTS = ['inset', 'raised'] as const

@customElement('web-ui-segmented')
export class WebUiSegmented extends FormAssociated(LitElement) {
  // 轨道是不透明实体面：底色取 surface（浅色即 page，深色即 surface-raised 档）、无
  // backdrop blur，描边环与投影仍由
  // .wui-glass 提供且全状态同值；指示器恒挂同一配方，静止态由 surface-segmented 实色
  // 盖住玻璃输出，按压与拖拽态才透出玻璃。
  // variant="raised" 切回经典形态：flat 灰轨道（surface-segmented、无环无投影）+
  // 实体白指示器（surface-selected + 柔投影），按压/拖拽态两变体同为透明玻璃；
  // 视觉差异全部由 :host([variant=...]) 规则承载，见 style.css。
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]
  @property({ type: String, reflect: true }) name = ''

  @property({ type: String, reflect: true })
  get variant(): 'inset' | 'raised' {
    return this._variant
  }
  set variant(v: string) {
    const old = this._variant
    this._variant = normalizeLiteral(v, ALLOWED_VARIANTS, 'inset')
    this.requestUpdate('variant', old)
  }
  private _variant: 'inset' | 'raised' = 'inset'

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) required = false

  @state() private _value = ''
  @state() private _indicatorReady = false
  @state() private _pressed = false
  @state() private _isDragging = false

  private _dragGestureHandle: DragGestureHandle | null = null

  /** 按压/拖拽中指示器实时覆盖的 trigger：其文字随覆盖即时着 primary，松手即撤下。 */
  private _coveredTrigger: WebUiSegmentedTrigger | null = null

  protected override updated(changed: PropertyValues) {
    super.updated(changed)
    this._applyLabelColors()
  }

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

    // 首帧只完成定位：先把当前定位以「未启用 left/width transition」状态提交为 before 值，
    // 再打开移动动画。若同一趟里 set 定位与启用 transition，浏览器会把 0→选项 当作一次过渡。
    if (!this._indicatorReady) {
      const indicator = this.renderRoot.querySelector<HTMLElement>('.wui-segmented-indicator')
      void indicator?.offsetWidth
      this._indicatorReady = true
    }
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
    this._syncCovered()

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
        this._syncCovered()
      },
      onEnd: info => {
        const wasDragging = this._isDragging
        this._isDragging = false
        this._pressed = false
        this._clearCovered()

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
        this._clearCovered()
        this._updateIndicator()
        this.requestUpdate()
      }
    })
  }

  private handlePointerUp() {
    this._pressed = false
    this._clearCovered()
  }

  private handlePointerLeave() {
    if (!this._dragGestureHandle?.isDragging()) {
      this._pressed = false
      this._clearCovered()
    }
  }

  /** 指示器实时覆盖的 trigger：按 --indicator-left/width 与各 trigger 的重叠度取最大者。
      拖拽中 onMove 持续覆写定位变量，读到的就是当前视觉位置；禁用项不参与覆盖。 */
  private _syncCovered() {
    const triggers = [...this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
    const enabledTriggers = triggers.filter(trigger => !trigger.disabled)
    if (enabledTriggers.length === 0) return

    const left = Number.parseFloat(this.style.getPropertyValue('--indicator-left')) || 0
    const width = Number.parseFloat(this.style.getPropertyValue('--indicator-width')) || 0
    if (width <= 0) return

    const groupRect = this.getBoundingClientRect()
    let covered: WebUiSegmentedTrigger | null = null
    let maxOverlap = 0
    for (const trigger of enabledTriggers) {
      const rect = trigger.getBoundingClientRect()
      const triggerLeft = rect.left - groupRect.left
      const overlap = Math.min(left + width, triggerLeft + rect.width) - Math.max(left, triggerLeft)
      if (overlap > maxOverlap) {
        maxOverlap = overlap
        covered = trigger
      }
    }

    if (covered === this._coveredTrigger) return
    this._coveredTrigger?.classList.remove('is-covered')
    covered?.classList.add('is-covered')
    this._coveredTrigger = covered
  }

  /** 松手/取消：撤下覆盖标记，文字色回落为 checked=primary、其余 secondary。 */
  private _clearCovered() {
    this._coveredTrigger?.classList.remove('is-covered')
    this._coveredTrigger = null
  }

  /**
   * 文字色契约（#169 用户验收反馈）：accent 只属于 variant="inset"，且按压/拖拽期间只属于
   * covered 项——checked 的 accent 在 pointerdown 即摘除，松手后回落。
   * 两个 internal 变量写在 host 上，经继承穿透 trigger 的 shadow 边界，所以运行时切 variant、
   * 动态插入 trigger 都不需要再同步 class；trigger 脱离 segmented 单独使用时变量缺省，
   * 由 trigger 侧的 fallback 保持 accent。
   */
  private _applyLabelColors() {
    const secondary = 'var(--wui-color-text-secondary, #6a6a6a)'
    const accent = 'var(--wui-color-accent, #08f)'
    // raised 回到 accent 之前的文字行为：checked 与未选中项同档灰，covered 同样不着 accent。
    const flat = this._variant === 'raised'
    const checked = flat || this._pressed || this._isDragging ? secondary : accent
    const covered = flat ? secondary : accent
    this.style.setProperty('--wui-internal-segmented-checked-label-color', checked)
    this.style.setProperty('--wui-internal-segmented-covered-label-color', covered)
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

  override formDisabledCallback(disabled: boolean) {
    this._formAssociation.setDisabled(disabled)
    this._groupController.sync()
  }

  override render() {
    return html`
      <div
        class=${classMap({
          'wui-glass': true,
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
        <span class="wui-glass wui-segmented-indicator"></span>
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
