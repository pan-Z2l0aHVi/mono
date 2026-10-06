import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'

import glass from '@/assets/glass.css?inline'
import { installPointerFocusSuppression } from '@/shared/focus/pointer-focus'
import { FormAssociated, defineFormAssociation, FormAssociationController } from '@/shared/form-association'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp, snapToNearest } from '@/shared/gesture/physics'
import { defineGroupCoordinator, GroupController } from '@/shared/group-management'
import { normalizeLiteral } from '@/shared/normalize'
import { parseDuration } from '@/shared/theme/duration'

import type { WebUiSegmentedTrigger } from '../segmented-trigger'

import style from './style.css?inline'

installPointerFocusSuppression()

const ALLOWED_VARIANTS = ['inset', 'raised'] as const

/*
 * 指示器移动时长取 `--wui-duration-trigger`，与 CSS 里 left / width 那两条 transition 同一个值。
 * 读不到 token 或格式不符时兜底 160（CSS 的 fallback 同值），负值钳到 0。
 *
 * reduced-motion 下不需要额外分支：theme 已把该 token 归零，settle 窗口随之变成 0，
 * 落定门自动退化成「每一步都直接落定」，而那本来就是 0ms 过渡的观感。
 */
function triggerDuration(el: HTMLElement): number {
  const parsed = parseDuration(getComputedStyle(el).getPropertyValue('--wui-duration-trigger'))
  return parsed === null ? 160 : Math.max(0, parsed)
}

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
  @state() private _settling = false
  @state() private _pressed = false
  @state() private _isDragging = false

  private _dragGestureHandle: DragGestureHandle | null = null
  /*
   * 飞行令牌 + 世代号（与 web-ui-theme 的 View Transition 飞行门同构）。
   *
   * 缺陷形态：指示器的 left / width 带着 160ms 过渡，而快速连点会连着改 value。若每次改值
   * 都照常起一段过渡，第二段过渡要从**第一段的插值中途**重新起步——指示器于是永远慢半拍，
   * 连点结束时还要再等一整轮才停到终值，与「已经选到第几项」对不上。
   *
   * 门的作用：上一段移动还在飞行时到达的新值**直接落定**——不排队、不重启插值。
   * 落定这一趟自己也要占一段飞行窗口，否则第三次连点又会在落定途中起一段新过渡。
   * 世代号用来丢弃过期回调：窗口到期时若已经有更新的飞行在跑（快速连点会连开窗口），
   * 旧定时器只能提前退出，否则它会把新一轮的落定状态一并清掉、门形同虚设。
   */
  private _settleFlight: object | null = null
  private _settleRequest = 0
  private _settleTimer: number | undefined

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._dragGestureHandle?.destroy()
    this._dragGestureHandle = null
    clearTimeout(this._settleTimer)
    this._settleTimer = undefined
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
    { afterSync: () => requestAnimationFrame(() => void this._updateIndicator()) }
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

  private async _updateIndicator() {
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

    // 上一段移动还在飞行 → 这次直接落定（_settling 关掉 left / width 过渡，见 style.css）。
    // 落定这一趟自己也要占飞行窗口，所以放在写定位**之前**开窗：窗口一开，第三次连点
    // 落到的仍是本趟的终值，而不是一个刚起步的插值。
    //
    // 首帧定位不开窗：那是初始化而不是一次「移动」，没有前一段飞行可言。开了窗反而会让
    // 「挂载后 160ms 内的第一次点击」直接落定——那次点击本该是用户看到的第一段动画。
    const landing = this._indicatorReady ? this._openSettleFlight() : false

    /*
     * 落定这一趟必须等 `.is-settling` 真的进了 DOM 再写定位。
     *
     * `_settling` 是 Lit 的 reactive state：`classMap` 要等一次异步更新才落到元素上，而
     * `--indicator-left` 是同步写的内联样式。顺序反了的话就是「先改位置、过渡仍开着、
     * 下一帧才补上关过渡的 class」——浏览器已经按插值起跑，异步补上的 class 只是把一段
     * 插值中途掐掉，落定表现为一次跳变而不是直接落定，且掐在哪一帧取决于调度。
     */
    if (landing) await this.updateComplete

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

  /*
   * 开一段飞行窗口：窗口内到达的改值一律落定，窗口到期才恢复插值过渡。
   *
   * 返回本次是否**落定**（飞行中到达的新值）。
   *
   * 时长取 `--wui-duration-trigger`（与 CSS 里 left / width 那两条过渡同一个值），所以
   * reduced-motion 下它就是 0ms——窗口立即到期，落定门自动退化成「每步都落定」，
   * 那正是 0ms 过渡本来的观感，不需要额外分支。
   *
   * 窗口每次改值都从零重开一整段时长（清掉旧定时器、世代号前进），而不是接着算剩余时长：
   * 剩余时长会让连续落定的窗口越缩越短，最后一次连点反倒拿到一段完整过渡——正是这个门
   * 要消除的那种观感。
   */
  private _openSettleFlight(): boolean {
    const wasFlying = this._settleTimer !== undefined
    const flight = {}
    this._settleFlight = flight
    const request = ++this._settleRequest
    clearTimeout(this._settleTimer)

    const duration = triggerDuration(this)
    if (duration === 0) {
      // 没有飞行就没有门可守：直接清掉落定态，让后续改值照常走 CSS 的过渡判定
      //（此时该过渡本身就是 0ms）。
      this._settleTimer = undefined
      this._settleFlight = null
      this._settling = false
      return false
    }

    // 已经在飞行中 → 这一趟是落定，保持落定态；否则是正常起一段过渡，先退出落定态。
    this._settling = wasFlying
    this._settleTimer = setTimeout(() => {
      this._settleTimer = undefined
      // 世代号校验：窗口被后续改值重开过，旧回调不得清掉新一轮的落定态。
      if (this._settleRequest !== request || this._settleFlight !== flight) return
      this._settleFlight = null
      this._settling = false
    }, duration)
    return wasFlying
  }

  private handlePointerDown(e: PointerEvent) {
    if (this._isDisabled) return
    const triggers = [...this.querySelectorAll<WebUiSegmentedTrigger>('web-ui-segmented-trigger')]
    const enabledTriggers = triggers.filter(t => !t.disabled)
    if (enabledTriggers.length === 0) return

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
            void this._updateIndicator()
          }
        }
        this.requestUpdate()
      },
      onCancel: () => {
        this._isDragging = false
        this._pressed = false
        void this._updateIndicator()
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
          'is-indicator-ready': this._indicatorReady,
          'is-settling': this._settling
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
