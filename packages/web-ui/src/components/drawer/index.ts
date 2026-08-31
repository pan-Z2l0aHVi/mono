import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { oouiClose } from '@/icons'
import { UserChangeController } from '@/shared/events/user-change'
import { attachDragGesture, type DragGestureHandle, rubberband, SPRING_PRESETS, springOffsets } from '@/shared/gesture'
import { normalizeLiteral } from '@/shared/normalize'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineNestedDrawerLayers } from '@/shared/overlay/nested-drawer-layers'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'
import { findNearestTheme } from '@/shared/theme/theme-scope'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['right', 'left', 'top', 'bottom'] as const

export type DrawerPlacement = (typeof ALLOWED_PLACEMENTS)[number]

// 拖拽关闭判定：位移超过抽屉尺寸 1/3，或闭合方向甩动速度超过 500px/s 视为关闭意图。
const DRAG_CLOSE_RATIO = 1 / 3
const DRAG_FLICK_VELOCITY = 500
const DRAG_REQUEST_WINDOW_MS = 120
const SPRING_SAMPLE_MS = 16

/*
 * 拖拽期间由 JS 写入的遮罩透明度变量参与 WAAPI 关键帧。未注册的自定义属性在
 * 关键帧之间是离散插值（半帧跳变），注册为 <number> 后获得线性插值。
 * inherits 必须为 true：::backdrop 只从 originating element 继承「可继承属性」，
 * 注册为不可继承会让变量到不了遮罩，跟手淡出整体失效（Chrome 151 实证）。
 * 注册表是全局的，模块重复执行（HMR）时捕获已注册错误并忽略。
 */
if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
  try {
    CSS.registerProperty({
      name: '--wui-internal-drag-backdrop-opacity',
      syntax: '<number>',
      inherits: true,
      initialValue: '1'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
  /*
   * 公开 token 注册为 <length>：Consumer 传 unitless 0 时计算值被归一为 0px，
   * 避免 calc(100% + 0) 因 number/percentage 不兼容而使闭合位移失效。
   */
  try {
    CSS.registerProperty({
      name: '--wui-drawer-inset',
      syntax: '<length>',
      inherits: true,
      initialValue: '8px'
    })
  } catch {
    // 已注册（如 HMR 重复执行）时忽略
  }
}

@customElement('web-ui-drawer')
export class WebUiDrawer extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  @property({ type: Boolean, reflect: true, attribute: 'no-backdrop-close' }) noBackdropClose = false

  /**
   * Controlled 模式下，Escape、遮罩、关闭按钮和拖拽关闭只派发 `open-change` 请求，
   * 不会自行修改 `open`。Consumer 回写 `open` 后才执行关闭动画。
   * 程序化 API（show/close/直接赋值 open）不受此模式影响，始终直通。
   */
  @property({ type: Boolean, reflect: true }) controlled = false

  @property({ type: String, reflect: true })
  get placement(): DrawerPlacement {
    return this._placement
  }
  set placement(v: string) {
    const old = this._placement
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'right')
    this.requestUpdate('placement', old)
  }
  private _placement: DrawerPlacement = 'right'

  // 标题文字（未传 header slot 时显示默认 header）
  @property({ type: String }) heading = ''

  @property({ type: Boolean, reflect: true }) closable = false

  /**
   * Headless 模式：只保留 overlay 基础设施（backdrop、动画、scroll lock、dialog 语义），
   * 移除内置 UI（glass 样式、header、close 按钮、footer）。Consumer 自定义内容样式。
   */
  @property({ type: Boolean, reflect: true }) headless = false

  /**
   * 内部原生 dialog 的 accessible name。headless 模式必须由 Consumer 提供，
   * 因为该模式不会渲染可自动关联的内置 header。
   */
  @property({ type: String, attribute: 'dialog-label' }) dialogLabel = ''

  /**
   * 启用拖拽关闭：打开态在抽屉内缘渲染 drag bar（灰色胶囊 + 加宽热区），
   * 指针拖拽实时跟手，松手按位移与甩动速度判定关闭或弹回。
   * 关闭态基于原生 dialog 无可见渲染物，因此不支持从关闭态拖拽打开。
   */
  @property({ type: Boolean, reflect: true }) override draggable = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  private _hasHeaderSlot = false
  private _hasFooterSlot = false
  private readonly _userOpenChange = new UserChangeController()
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this.open
  })
  // nested 层序：打开后纳入全局栈，上层打开/关闭时本层缩放平移（对齐 Base UI）。
  private readonly _nestedLayers = defineNestedDrawerLayers().make({
    getDialog: () => this.dialog,
    getPlacement: () => this._placement
  })

  // ===== 拖拽关闭手势状态 =====
  private _dragGesture: DragGestureHandle | null = null
  // pointerdown 时刻已存在的闭合方向位移（从弹回动画中抓取时非 0）。
  private _dragInitialOffset = 0
  private _dragOffset = 0
  private _dragAnimation: Animation | null = null
  // controlled：弹簧到闭合位后等待 Consumer 回写 open；超时未回写则弹回。
  private _dragAwaitWriteback = false
  private _dragRequestTimer: ReturnType<typeof setTimeout> | undefined

  // placement 的闭合轴向：right/left 沿 X 轴，top/bottom 沿 Y 轴。
  private get _dragAxis(): 'x' | 'y' {
    return this._placement === 'left' || this._placement === 'right' ? 'x' : 'y'
  }

  // 位移正方向 = 抽屉的闭合方向（拖出屏幕为正）。
  private get _dragCloseSign(): number {
    switch (this._placement) {
      case 'right':
        return 1
      case 'left':
        return -1
      case 'top':
        return -1
      case 'bottom':
        return 1
    }
  }

  private _measureDragSize(): number {
    const dialog = this.dialog
    if (!dialog) return 0
    return this._dragAxis === 'x' ? dialog.offsetWidth : dialog.offsetHeight
  }

  // 浮动卡片（非 headless）的四周留边；闭合位移需越过它才能完全滑出视口。
  // headless 在 :host([headless]) dialog 上显式归零（防嵌套继承），解析失败回退 0。
  private _readDrawerInset(dialog: HTMLDialogElement): number {
    const raw = getComputedStyle(dialog).getPropertyValue('--wui-internal-drawer-inset')
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }

  // 闭合方向上的完全出屏距离：抽屉尺寸 + 浮动留边（headless 下即尺寸本身）。
  // CSS 闭合态 transform、controlled 悬停终态与弹簧终点共用同一数学，避免衔接跳变。
  private _dragCloseDistance(dialog: HTMLDialogElement): number {
    return this._measureDragSize() + this._readDrawerInset(dialog)
  }

  private _isReducedMotion(): boolean {
    // 优先尊重所在 web-ui-theme 的 motion 设置（与 svg-draw-lines 一致）；
    // 无主题范围时回退到系统 prefers-reduced-motion。jsdom 等环境无 matchMedia，视为完整动效。
    const theme = findNearestTheme(this)
    if (theme) return theme.isReducedMotion()
    try {
      return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch {
      return false
    }
  }

  private _isDragging(): boolean {
    return this._dragGesture?.isDragging() ?? false
  }

  private _cancelDragAwait() {
    if (this._dragRequestTimer !== undefined) {
      clearTimeout(this._dragRequestTimer)
      this._dragRequestTimer = undefined
    }
    this._dragAwaitWriteback = false
  }

  private _handleDragPointerDown(e: PointerEvent) {
    if (!this.open || !this.draggable || this._isDragging()) return
    // 多点触控的副指针（isPrimary 明确为 false）不参与手势。
    if (e.isPrimary === false) return

    const dialog = this.dialog
    if (!dialog) return
    // is-visible 由 presence 在 showModal 后一帧加上；就位前（打开极早期）忽略。
    // 就位后即使 enter 过渡仍在进行也允许抓取，起始位移从当前计算值续接。
    if (!dialog.classList.contains('is-visible')) return

    // 先读取动画中的当前位移再取消弹回动画，避免取消后回跳到内联样式值。
    const currentTransform = getComputedStyle(dialog).transform
    const axisValue =
      currentTransform && currentTransform !== 'none' && typeof DOMMatrixReadOnly === 'function'
        ? new DOMMatrixReadOnly(currentTransform)[this._dragAxis === 'x' ? 'm41' : 'm42']
        : 0
    this._dragAnimation?.cancel()
    this._dragAnimation = null
    this._cancelDragAwait()

    this._dragInitialOffset = axisValue * this._dragCloseSign
    this._dragOffset = this._dragInitialOffset
    dialog.classList.add('is-dragging')

    this._dragGesture = attachDragGesture(e, {
      axis: this._dragAxis,
      onMove: info => {
        const pointerDelta = this._dragAxis === 'x' ? info.deltaX : info.deltaY
        // 闭合方向全额跟随；开启方向施加阻尼（橡皮筋），最多回弹 10% 抽屉尺寸。
        const raw = this._dragInitialOffset + pointerDelta * this._dragCloseSign
        this._dragOffset = rubberband(raw, this._measureDragSize() * 0.1, 0.15)

        // 达到关闭阈值时胶囊变 accent 色作视觉确认（ADR-0035）。
        const dragSize = this._measureDragSize()
        dialog.classList.toggle('is-drag-close', dragSize > 0 && this._dragOffset > dragSize * DRAG_CLOSE_RATIO)
        this._applyDragOffset(dialog, this._dragOffset)
      },
      onEnd: info => {
        this._dragGesture = null
        dialog.classList.remove('is-dragging', 'is-drag-close')
        const size = this._measureDragSize()
        const velocity = (this._dragAxis === 'x' ? info.velocityX : info.velocityY) * this._dragCloseSign
        const shouldClose =
          this._dragOffset > size * DRAG_CLOSE_RATIO || (this._dragOffset > 8 && velocity > DRAG_FLICK_VELOCITY)

        if (shouldClose) this._springToClose(dialog, velocity)
        else this._springRebound(dialog, velocity, this._dragOffset)
      },
      onCancel: () => {
        this._dragGesture = null
        dialog.classList.remove('is-dragging', 'is-drag-close')
        this._springRebound(dialog, 0, this._dragOffset)
      }
    })
  }

  // 受控状态写入等外部原因强制终结拖拽：清手势状态与拖拽样式，不弹回，
  // 后续管线（关闭/打开）由调用方继续执行。
  private _cancelActiveDrag() {
    if (!this._isDragging()) return
    this._dragGesture?.destroy()
    this._dragGesture = null
    const dialog = this.dialog
    if (!dialog) return
    dialog.classList.remove('is-dragging', 'is-drag-close')
    this._clearDragStyles(dialog)
  }

  // 将闭合方向位移映射为 dialog transform，并同步遮罩透明度保持跟手反馈。
  private _applyDragOffset(dialog: HTMLDialogElement, offset: number) {
    const sign = this._dragCloseSign
    const value = offset * sign
    dialog.style.transform = this._dragAxis === 'x' ? `translateX(${value}px)` : `translateY(${value}px)`
    const size = this._measureDragSize()
    const progress = size > 0 ? Math.min(1, Math.max(0, offset / size)) : 0
    dialog.style.setProperty('--wui-internal-drag-backdrop-opacity', String(1 - progress))
  }

  private _clearDragStyles(dialog: HTMLDialogElement) {
    dialog.style.removeProperty('transform')
    dialog.style.removeProperty('--wui-internal-drag-backdrop-opacity')
  }

  // 弹簧到完全闭合；controlled 下保持闭合位等待回写，其余走常规关闭管线。
  private _springToClose(dialog: HTMLDialogElement, velocity: number) {
    const from = this._dragOffset
    this._dragOffset = 0
    const sign = this._dragCloseSign
    // 弹簧终点 = 完全出屏距离（含浮动留边），与 CSS 闭合态/悬停终态一致，
    // 否则 onfinish 后会有一个留边宽度的瞬移。
    const to = this._dragCloseDistance(dialog)
    const size = this._measureDragSize()

    const finishClose = () => {
      if (this.controlled) {
        // 保持在闭合位（is-visible 未移除，状态仍 open），等待 Consumer 回写或超时弹回。
        const distance = to
        dialog.style.transform =
          this._dragAxis === 'x' ? `translateX(${distance * sign}px)` : `translateY(${distance * sign}px)`
        dialog.style.setProperty('--wui-internal-drag-backdrop-opacity', '0')
      } else {
        // 移除 is-visible 后基础 transform 即闭合位，清内联样式不产生跳变；
        // presence.sync(false) 检测不到 is-visible 会立即完成关闭，不重播退出动画。
        dialog.classList.remove('is-visible')
        this._clearDragStyles(dialog)
      }
      this._closeFromDrag()
    }

    if (this._isReducedMotion() || typeof dialog.animate !== 'function') {
      finishClose()
      return
    }

    const samples = springOffsets(from, to, velocity, SPRING_PRESETS.close)
    const keyframes = samples.map(o => ({
      transform: this._dragAxis === 'x' ? `translateX(${o * sign}px)` : `translateY(${o * sign}px)`,
      '--wui-internal-drag-backdrop-opacity': String(Math.max(0, 1 - o / size))
    }))
    // 采样帧含首值与附加终点，实际时长为帧间隔数 × 采样周期。
    const duration = (samples.length - 1) * SPRING_SAMPLE_MS
    const animation = dialog.animate(keyframes, { duration, easing: 'linear' })
    // onfinish 同步应用终态并取消动画：fill 会持续覆盖 transform，阻断后续 CSS 过渡。
    animation.onfinish = () => {
      animation.cancel()
      finishClose()
    }
  }

  // 弹回打开：从 from 位移弹回 0；结束后清内联样式交还 CSS transition 管辖。
  private _springRebound(dialog: HTMLDialogElement, velocity: number, from: number) {
    this._dragOffset = 0

    const finishRebound = () => {
      this._dragAnimation = null
      dialog.classList.remove('is-dragging')
      this._clearDragStyles(dialog)
    }

    if (this._isReducedMotion() || typeof dialog.animate !== 'function' || Math.abs(from) < 1) {
      finishRebound()
      return
    }

    const sign = this._dragCloseSign
    const size = this._measureDragSize()
    const samples = springOffsets(from, 0, velocity, SPRING_PRESETS.rebound)
    const keyframes = samples.map(o => ({
      transform: this._dragAxis === 'x' ? `translateX(${o * sign}px)` : `translateY(${o * sign}px)`,
      '--wui-internal-drag-backdrop-opacity': String(Math.max(0, 1 - o / size))
    }))
    // 弹回期间抑制 transform/backdrop 的 CSS transition，避免与弹簧动画叠加。
    dialog.classList.add('is-dragging')
    const duration = (samples.length - 1) * SPRING_SAMPLE_MS
    const animation = dialog.animate(keyframes, { duration, easing: 'linear' })
    // onfinish 同步清除内联样式并取消动画：fill 会持续覆盖 transform，阻断后续 CSS 过渡。
    animation.onfinish = () => {
      animation.cancel()
      finishRebound()
    }
    this._dragAnimation = animation
  }

  private _closeFromDrag() {
    // 先派发关闭请求（_closeFromUser），再进入悬停等待：等待态中 _closeFromUser
    // 会被 L2 去重守卫短路，顺序颠倒会吞掉首次请求。
    this._closeFromUser()
    if (this.controlled) {
      this._dragAwaitWriteback = true
      this._dragRequestTimer = setTimeout(this._handleDragWritebackTimeout, DRAG_REQUEST_WINDOW_MS)
    }
  }

  // controlled 回写窗口超时：Consumer 拒绝关闭，从闭合位弹回打开位。
  private readonly _handleDragWritebackTimeout = () => {
    this._dragRequestTimer = undefined
    if (!this._dragAwaitWriteback || !this.open || this._isDragging()) {
      this._dragAwaitWriteback = false
      return
    }
    this._dragAwaitWriteback = false

    const dialog = this.dialog
    if (!dialog) return
    dialog.classList.add('is-visible')
    // 悬停终态位于完全出屏位（含留边），弹回也从该真实位置起步，避免首帧内跳。
    this._springRebound(dialog, 0, this._dragCloseDistance(dialog))
  }

  override connectedCallback() {
    super.connectedCallback()
    this._hasHeaderSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'header')
    this._hasFooterSlot = Array.from(this.children).some(child => child.getAttribute?.('slot') === 'footer')
  }

  override firstUpdated() {
    this._checkSlotContent('footer')
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._nestedLayers.dispose()
    this._dragGesture?.destroy()
    this._dragGesture = null
    this._presence.dispose()
    this._scrollLock.release()
    this._dragAnimation?.cancel()
    this._dragAnimation = null
    this._cancelDragAwait()
  }

  private _checkSlotContent(name: string) {
    const slot = this.shadowRoot?.querySelector(`slot[name="${name}"]`) as HTMLSlotElement | null
    if (!slot) return
    const has = slot.assignedNodes().length > 0
    if (name === 'footer' && has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  private handleHeaderSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasHeaderSlot) {
      this._hasHeaderSlot = has
      this.requestUpdate()
    }
  }

  private handleFooterSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().length > 0
    if (has !== this._hasFooterSlot) {
      this._hasFooterSlot = has
      this.requestUpdate()
    }
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('open')) {
      // Consumer 在拖拽进行中写入受控 open：受控状态优先，立即终结手势（等同
      // pointercancel 的清理但不弹回），交由下方 presence 走标准关闭/打开管线。
      if (this._isDragging() && !this.open) this._cancelActiveDrag()
      if (this._userOpenChange.consume()) this.emitOpenChange()
      // controlled 拖拽关闭的回写结果：确认关闭则清除闭合位悬停状态走正常关闭；
      // 拒绝关闭（回写 open=true）则从闭合位（含留边）弹回。
      if (this._dragAwaitWriteback) {
        this._cancelDragAwait()
        const dialog = this.dialog
        if (dialog && !this.open) {
          dialog.classList.remove('is-visible')
          this._clearDragStyles(dialog)
        } else if (dialog && this.open) {
          this._springRebound(dialog, 0, this._dragCloseDistance(dialog))
        }
      }
      this._presence.sync(this.open)
      if (this.open) {
        // presence.sync 已同步发起 showModal：此刻 dialog.open 为真，计数出正确
        // 的层序 depth 并驱动下层缩放。直接同步 register，不等待 is-visible
        //（那要再等一帧，且打开过渡期间上层关系已应确立）。
        this._nestedLayers.register()
      } else {
        this._nestedLayers.unregister()
      }
    }
    if (props.has('open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  private handleTransitionEnd(e: TransitionEvent) {
    this._presence.handleTransitionEnd(e)
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    /*
     * nested 场景防连锁：子 drawer 的 dialog 经 slot 投影在本层 shadow 内，其
     * keydown composed 冒泡路径会再次经过本层 dialog（事件路径含 slot 宿主链）。
     * 若事件传播路径在本层 dialog 之前已存在其他 <dialog>，说明该事件来自子层，本层忽略。
     */
    const path = e.composedPath()
    const ownDialogIndex = path.indexOf(e.currentTarget as Node)
    if (ownDialogIndex > 0) {
      const hasChildDialog = path.slice(0, ownDialogIndex).some(n => n instanceof HTMLDialogElement)
      if (hasChildDialog) return
    }
    // 拖拽进行中忽略 ESC，避免手势与关闭管线竞争。
    if (this._isDragging()) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    this._closeFromUser()
  }

  show() {
    if (this.open) return
    this.open = true
  }

  close() {
    if (!this.open) return
    this.open = false
  }

  private readonly _closeFromUser = () => {
    if (!this.open) return
    // controlled 悬停等待回写期间，关闭意图已在途（open-change 已派发）：
    // Escape/遮罩/关闭按钮的重复触发不再派发第二次请求，也不与超时弹回竞争。
    if (this._dragAwaitWriteback) return
    if (this.controlled) {
      this.emitOpenChange(false)
      return
    }

    this._userOpenChange.mark()
    this.close()
  }

  private handleCancel(e: Event) {
    // 保留 top layer 直到 CSS 过渡结束，避免原生关闭跳过退出动画。
    e.preventDefault()
    this._closeFromUser()
  }

  private handleNativeClose() {
    if (!this.open) return

    // 悬停等待期间的原生关闭（如表单 method="dialog"）：视为回写窗口内的重复
    // 关闭意图，取消等待不补发请求；已原生关闭的 dialog 不再被超时弹回拉起。
    if (this._dragAwaitWriteback) {
      this._cancelDragAwait()
      return
    }

    // 原生关闭可绕过 cancel；controlled 时恢复受控状态，由 Consumer 决定是否关闭。
    if (this.controlled) {
      this._presence.sync(true)
      this.emitOpenChange(false)
      return
    }

    this._presence.handleNativeClose()
    this._userOpenChange.mark()
    this.open = false
  }

  private handleBackdropClick(e: MouseEvent) {
    if (e.target !== (e.currentTarget as HTMLDialogElement)) return
    if (this.noBackdropClose) return
    // 拖拽进行中 pointer capture 使 click 落在 dialog 上，忽略以避免与手势竞争。
    if (this._isDragging()) return
    this._closeFromUser()
  }

  private emitOpenChange(open = this.open) {
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  override render() {
    const showHeader = this._hasHeaderSlot || !!this.heading
    const dialogLabel = this.dialogLabel.trim()
    const dialogLabelledBy = !dialogLabel && !this.headless && showHeader ? 'wui-drawer-heading' : nothing

    // 拖拽热区：仅在打开且 draggable 时渲染；胶囊 + 加宽命中条贴在抽屉内缘。
    const dragBar = this.draggable
      ? html`
          <div class="wui-drawer-drag-zone" @pointerdown=${this._handleDragPointerDown}>
            <div class="wui-drawer-drag-bar"></div>
          </div>
        `
      : nothing

    // 保持同一个 dialog 实例，避免打开期间切换 headless 时脱离 top layer。
    return html`
      <dialog
        aria-label=${dialogLabel || nothing}
        aria-labelledby=${dialogLabelledBy}
        @cancel=${this.handleCancel}
        @close=${this.handleNativeClose}
        @click=${this.handleBackdropClick}
        @keydown=${this.handleKeydown}
        @transitionend=${this.handleTransitionEnd}
      >
        ${
          this.headless
            ? html`<slot></slot>${dragBar}`
            : html`
                <div class="wui-drawer-body wui-glass">
                  <div class="wui-drawer-header" id="wui-drawer-heading" ?hidden=${!showHeader}>
                    <slot name="header" @slotchange=${this.handleHeaderSlotChange}>
                      ${this.heading ? html`<span class="wui-drawer-heading">${this.heading}</span>` : nothing}
                    </slot>
                  </div>
                  <div class="wui-drawer-content">
                    <slot></slot>
                  </div>
                  <div class="wui-drawer-footer" ?hidden=${!this._hasFooterSlot}>
                    <slot name="footer" @slotchange=${this.handleFooterSlotChange}></slot>
                  </div>
                </div>
                ${
                  this.closable
                    ? html`
                        <web-ui-button
                          class="wui-drawer-close"
                          @click=${this._closeFromUser}
                          aria-label="关闭"
                          variant="secondary"
                          icon
                          size="26"
                        >
                          <web-ui-icon .icon=${oouiClose}></web-ui-icon>
                        </web-ui-button>
                      `
                    : nothing
                }
                ${dragBar}
              `
        }
      </dialog>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-drawer': WebUiDrawer
  }
}
