import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import '@/components/icon'
import '@/components/button'
import glass from '@/assets/glass.css?inline'
import { oouiClose } from '@/icons'
import { UserChangeController } from '@/shared/events/user-change'
import { attachDragGesture, dampOverscroll, type DragGestureHandle } from '@/shared/gesture'
import { normalizeLiteral } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineNestedDrawerLayers } from '@/shared/overlay/nested-drawer-layers'
import { findNearestTheme } from '@/shared/overlay/theme-overlay-scope'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const ALLOWED_PLACEMENTS = ['right', 'left', 'top', 'bottom'] as const

export type DrawerPlacement = (typeof ALLOWED_PLACEMENTS)[number]

/*
 * 释放后的拖拽关闭判定：
 *
 * - 基准校准：位移零点与判定时钟都在**首个 pointermove** 处重置（手势层
 *   `calibrateOnFirstMove`，drawer 显式开启），吸收「按下 → 首个 move」之间的空隙——
 *   触摸输入的首个 move 常已相对按下点偏移，不重置会让元素在首个 move 一次性兑现
 *   而跳动。代价是这段位移被丢弃，一次手势至少要累积两个 move 才可能产生位移；
 *   `DragMoveInfo/DragEndInfo` 的 `delta*` 与 `duration` 均以该点为零点与起点。
 * - 距离：**自抓取瞬间起的净位移**超过抽屉尺寸的一半（下限 10px）。用净位移而不是
 *   绝对位置：从弹回/收尾途中重新抓取时，抓取瞬间停在哪里都不算「已经拖过一半」。
 *   尺寸量不到时（0）由下限兜底，保证退化场景不会因为阈值 0 而「动一下就关」。
 * - 甩动：整段手势的平均速度**达到** 500px/s（含等号）。用「整段手势」而不是释放
 *   瞬间的滑窗速度：滑窗只描述最后一小段轨迹，反向回扫（先往打开方向拖进量程，
 *   再快速扫回）在释放瞬间同样能凑出很高的滑窗速度，但它不是朝关闭方向的甩动。
 *   净速度 = 净位移 / 整段时长（自校准点起算），分母钳到 50ms；时长为 0 时速度取 0，
 *   而不是按 50ms 兜底放大——直接放大会把「测不到时长」变成一次甩动。
 * - 方向：净位移未朝闭合方向（`<= 0`）时一律弹回。
 * - 改主意：拖拽期内追踪「自折返点起」的位移，一旦自方向确认点回撤满 10px 即标记
 *   取消，甩动分支此后拒绝关闭；位移重新越过关闭距离阈值时清除标记，即
 *   「已经拖过一半」不受回撤影响。见 `_trackSwipeCancel`。
 * - 过冲阻尼：闭合方向全额 1:1 跟手，反向按 `dampOverscroll` 平方根压缩。阻尼作用于
 *   **本次手势的增量**，再叠加抓取瞬间的基准位移；对总位移做阻尼会连基准一起压缩，
 *   元素不再接着视觉位置走。
 */
const DRAG_CLOSE_RATIO = 0.5
const DRAG_MIN_CLOSE_DISTANCE = 10
const DRAG_FLICK_VELOCITY = 500
const DRAG_MIN_VELOCITY_SPAN_MS = 50
const DRAG_REVERSE_CANCEL_THRESHOLD = 10
const DRAG_REQUEST_WINDOW_MS = 120
// 热区外扩带内的轻点判定距离：自抓取瞬间起的净位移未越过该值视为轻点，
// 沿用该区域改造前「点遮罩关闭」的语义（对齐 _dragCloseThreshold 的 10px 下限量级）。
const DRAG_ZONE_TAP_DISTANCE = 10
// --wui-drawer-drag-zone-outset 的解析失败回退值，与 style.css 的 fallback 保持一致。
const DRAG_ZONE_OUTSET_FALLBACK_PX = 12

/*
 * 释放后的收尾（弹回打开位 / 滑出到闭合位）由 CSS transition 接管（issue #123）：
 * 拖拽期间内联 transform + `transition: none`，松手时把终值与过渡参数写入内联并在
 * 同一次样式重算里解除抑制，回弹即唯一的一次 CSS 过渡。全程无 `element.animate()`、
 * 无 fill、无 JS→CSS 动画交接边界，因此不存在 Safari 采不到 before-change style 的
 * 窗口（r3 的 reflow 烘焙补丁随 WAAPI 一并退役）。
 *
 * 代价是失去弹簧的速度感知轨迹：释放速度只用于估算过渡时长，过冲手感由缓动曲线
 * 近似。两条曲线对应原弹簧预设的阻尼比——close（ζ≈1.05）无过冲，
 * rebound（ζ≈0.74）保留约 3% 过冲。
 */
const SETTLE_MIN_MS = 180
const SETTLE_MAX_MS = 420
const SETTLE_EASE_CLOSE = 'cubic-bezier(0.32, 0.72, 0, 1)'
// 过冲量由 y1 决定：1.3 时峰值 ≈2.99%，与 ζ≈0.74 的理论过冲（3.15%）对齐；1.12 只剩 0.37%。
const SETTLE_EASE_REBOUND = 'cubic-bezier(0.22, 1.3, 0.36, 1)'
// 估算时长的速度下限（px/s）：静止释放时退化为最大时长，避免除零与无限时长。
const SETTLE_MIN_VELOCITY = 1
// transitionend 兜底定时器的宽限：覆盖一帧的调度抖动。
const SETTLE_GRACE_MS = 80

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
  /*
   * 收尾过渡的时长：注册为 <time> 后 ::backdrop 也能继承到同一值。不注册时变量在
   * transition 简写里只是 token 替换，值一旦无效整条声明在计算值阶段失效
   * （退化为 transition: none），回弹会变成瞬移。
   * 缓动不注册：CSS 属性语法没有 <easing-function>，且它不需要插值，靠 var() 的
   * 兜底值即可。
   */
  try {
    CSS.registerProperty({
      name: '--wui-internal-settle-duration',
      syntax: '<time>',
      inherits: true,
      initialValue: '280ms'
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
  // nested 层序：打开后纳入全局栈，上层打开/关闭时本层缩放平移。
  private readonly _nestedLayers = defineNestedDrawerLayers().make({
    getDialog: () => this.dialog,
    getPlacement: () => this._placement
  })

  // ===== 拖拽关闭手势状态 =====
  private _dragGesture: DragGestureHandle | null = null
  // pointerdown 落在热区向 mask 侧外扩的 band 内时置位。band 覆盖面板边缘外的遮罩区域，
  // 改造前按在这里松手走「遮罩点击关闭」；外扩后手势接管，轻点仍保留关闭语义（onEnd 消费）。
  private _dragPressInBand = false
  // pointerdown 时刻已存在的闭合方向位移（从弹回动画中抓取时非 0）。
  private _dragInitialOffset = 0
  private _dragOffset = 0
  // ===== 松手判定基准 =====
  // 位移零点与判定时钟由手势层的 `calibrateOnFirstMove` 校准到首个 pointermove，
  // 这里只保留「改主意」相关的追踪状态。
  // 折返点（轴坐标）：随反向移动拉到当前坐标。
  private _cancelBaseline = 0
  // 上一次 move 的轴坐标，用于求移动量。
  private _lastAxisPos = 0
  // 方向确认时的位移；负值表示方向尚未确认。
  private _swipeIntentDisp = -1
  // 已判定为「改主意」，甩动分支据此拒绝关闭。
  private _swipeCancelled = false
  // 释放后的 CSS transition 收尾：完成回调，以及终值与当前值相同时
  // 不会派发 transitionend 的兜底定时器。
  private _settleFinish: (() => void) | null = null
  private _settleTimer: ReturnType<typeof setTimeout> | undefined
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

  // 关闭距离阈值：尺寸的一半，下限 10px。
  // 胶囊的 accent 视觉确认与实际判定共用同一阈值，两者不会漂移。
  private _dragCloseThreshold(size: number): number {
    return Math.max(size * DRAG_CLOSE_RATIO, DRAG_MIN_CLOSE_DISTANCE)
  }

  // 浮动卡片（非 headless）的四周留边；闭合位移需越过它才能完全滑出视口。
  // headless 在 :host([headless]) dialog 上显式归零（防嵌套继承），解析失败回退 0。
  private _readDrawerInset(dialog: HTMLDialogElement): number {
    const raw = getComputedStyle(dialog).getPropertyValue('--wui-internal-drawer-inset')
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : 0
  }

  // 热区向 mask 侧外扩的宽度（同名 CSS 变量由 consumer 覆盖；解析失败回退 CSS 默认值）。
  private _readDragZoneOutset(dialog: HTMLDialogElement): number {
    const raw = getComputedStyle(dialog).getPropertyValue('--wui-drawer-drag-zone-outset')
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) ? parsed : DRAG_ZONE_OUTSET_FALLBACK_PX
  }

  // 按下点是否在热区外扩带内：位于热区所在的那条面板边之外、且越出距离不超过 outset。
  // 闭合方向 sign 决定热区贴哪条边：right/bottom 抽屉热区贴左/上缘（mask 在 rect 外侧的
  // left/top 方向），left/top 抽屉热区贴右/下缘。band 之外的远处坐标（如合成事件的任意
  // clientX）不算 band，轻点关闭语义不适用。
  private _isPressInDragBand(clientX: number, clientY: number, rect: DOMRect, outset: number): boolean {
    if (outset <= 0) return false
    if (this._dragAxis === 'x') {
      const beyond = this._dragCloseSign > 0 ? rect.left - clientX : clientX - rect.right
      return beyond > 0 && beyond <= outset
    }
    const beyond = this._dragCloseSign > 0 ? rect.top - clientY : clientY - rect.bottom
    return beyond > 0 && beyond <= outset
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

    // band 判定用含当前 transform 的 getBoundingClientRect：与按下点同帧基准，
    // enter 过渡中被抓取时位置语义仍然一致。
    const panelRect = dialog.getBoundingClientRect()
    this._dragPressInBand = this._isPressInDragBand(e.clientX, e.clientY, panelRect, this._readDragZoneOutset(dialog))

    // 先读取动画中的当前位移再取消弹回动画，避免取消后回跳到内联样式值。
    const currentTransform = getComputedStyle(dialog).transform
    const axisValue =
      currentTransform && currentTransform !== 'none' && typeof DOMMatrixReadOnly === 'function'
        ? new DOMMatrixReadOnly(currentTransform)[this._dragAxis === 'x' ? 'm41' : 'm42']
        : 0
    // 收尾过渡进行中被重新抓取：丢弃收尾状态（不执行其回调，避免它回头写内联），
    // 位移已在下面按当前计算值续接。
    this._abortSettle()
    this._cancelDragAwait()

    this._dragInitialOffset = axisValue * this._dragCloseSign
    this._dragOffset = this._dragInitialOffset
    // 判定基准复位：折返点从按下位置起算。
    const axisPos = this._dragAxis === 'x' ? e.clientX : e.clientY
    this._cancelBaseline = axisPos
    this._lastAxisPos = axisPos
    this._swipeIntentDisp = -1
    this._swipeCancelled = false
    dialog.classList.add('is-dragging')
    // 收尾过渡进行中重新抓取时内联还停在收尾终值（打开位/闭合位），不写回当前位移
    // 会在抑制生效的瞬间跳到终值。写回后计算值 == 抓取瞬间的视觉位置，无跳变。
    this._applyDragOffset(dialog, this._dragOffset)

    this._dragGesture = attachDragGesture(e, {
      axis: this._dragAxis,
      // 拖拽零点与判定时钟一起重置到首个 move。
      calibrateOnFirstMove: true,
      onMove: info => {
        // info 的 delta/duration 已以校准点为零点。
        const pointerDelta = this._dragAxis === 'x' ? info.deltaX : info.deltaY
        // 本次手势自校准点起的**增量**（朝闭合方向为正，未阻尼）。
        const dragDelta = pointerDelta * this._dragCloseSign
        // 阻尼只作用于增量，再叠加抓取瞬间的基准位移。对总位移做阻尼会在「从弹回中
        // 重新抓取」时差出可见位移——基准位移本身会被一起压缩，元素不再接着视觉位置走。
        this._dragOffset = this._dragInitialOffset + dampOverscroll(dragDelta)
        this._trackSwipeCancel(this._dragAxis === 'x' ? info.clientX : info.clientY, dragDelta)

        // 达到关闭阈值时胶囊变 accent 色作视觉确认（ADR-0027）。与距离分支共用同一量
        //（自抓取瞬间起的净位移）与同一阈值，视觉确认与实际判定不会漂移。
        const dragSize = this._measureDragSize()
        const dragDisplacement = this._dragOffset - this._dragInitialOffset
        dialog.classList.toggle('is-drag-close', dragDisplacement > this._dragCloseThreshold(dragSize))
        this._applyDragOffset(dialog, this._dragOffset)
      },
      onEnd: info => {
        this._dragGesture = null
        dialog.classList.remove('is-dragging', 'is-drag-close')
        const size = this._measureDragSize()
        const velocity = (this._dragAxis === 'x' ? info.velocityX : info.velocityY) * this._dragCloseSign
        // 净位移从抓取瞬间的位移起算（弹回/收尾过渡中被重新抓取时起点非 0）。
        const displacement = this._dragOffset - this._dragInitialOffset
        // 时长同样自校准点（首个 move）起算，与位移零点同源：按下后的停顿不参与分母。
        // 分母下限 50ms；时长量为 0（首尾时间戳相同，或事件时间戳不可用/倒退）时速度取
        // 0——直接按 50ms 兜底会把「测不到时长」放大成一次甩动。
        const netVelocity =
          info.duration > 0 ? (displacement / Math.max(info.duration, DRAG_MIN_VELOCITY_SPAN_MS)) * 1000 : 0
        // 甩动判据：净位移朝闭合方向（`> 0`）、平均速度达到阈值（`>=`）、
        // 且本次手势未被判定为「改主意」。
        const flicked = displacement > 0 && netVelocity >= DRAG_FLICK_VELOCITY && !this._swipeCancelled
        // 距离分支同样用净位移，不是绝对位置：抓取瞬间停在哪里都不算「已经拖过一半」。
        // `_dragOffset` 只留给收尾的起点使用。
        const shouldClose = displacement > this._dragCloseThreshold(size) || flicked

        // 外扩带按压的轻点沿用「点遮罩关闭」语义（noBackdropClose 时该区域不接管关闭）。
        // 位移越过 tap 距离即视为真实拖拽，交给下方正常判定——band 内朝 mask 快甩弹回，
        // 正是本次外扩要修复的误关场景。
        if (this._dragPressInBand && Math.abs(displacement) <= DRAG_ZONE_TAP_DISTANCE) {
          if (!this.noBackdropClose) {
            this._closeFromUser()
            return
          }
        }

        if (shouldClose) this._settleToClose(dialog, velocity)
        else this._settleRebound(dialog, velocity, this._dragOffset)
      },
      onCancel: () => {
        this._dragGesture = null
        dialog.classList.remove('is-dragging', 'is-drag-close')
        this._settleRebound(dialog, 0, this._dragOffset)
      }
    })
  }

  /*
   * 「改主意」守卫。
   *
   * 折返点随「反向移动」被拉到当前坐标，因此「自折返点起的位移」度量的是**自最近一次
   * 折返之后**回撤了多少：一旦它比方向确认时的位移少满 10px，本次手势即被标记为
   * 「改主意」，甩动分支据此拒绝关闭；位移重新越过关闭距离阈值即清除标记，
   * 即「已经拖过一半」不受回撤影响。
   *
   * @param axisPos 本次 move 在主轴上（`_dragAxis`）的指针坐标
   * @param displacement 自校准点起、朝闭合方向的**未阻尼**位移
   */
  private _trackSwipeCancel(axisPos: number, displacement: number) {
    const movement = axisPos - this._lastAxisPos
    this._lastAxisPos = axisPos
    if ((movement < 0 && axisPos > this._cancelBaseline) || (movement > 0 && axisPos < this._cancelBaseline)) {
      this._cancelBaseline = axisPos
    }

    if (this._swipeIntentDisp < 0) {
      // 方向确认：首次朝闭合方向累积出位移。
      if (displacement > 0) this._swipeIntentDisp = displacement
      return
    }

    const cancelDisplacement = (axisPos - this._cancelBaseline) * this._dragCloseSign
    if (cancelDisplacement > this._dragCloseThreshold(this._measureDragSize())) {
      this._swipeCancelled = false
    } else if (this._swipeIntentDisp - cancelDisplacement >= DRAG_REVERSE_CANCEL_THRESHOLD) {
      this._swipeCancelled = true
    }
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

  // 由 CSS transition 收尾到完全闭合；controlled 下保持闭合位等待回写，其余走常规关闭管线。
  private _settleToClose(dialog: HTMLDialogElement, velocity: number) {
    const from = this._dragOffset
    this._dragOffset = 0
    // 终点 = 完全出屏距离（含浮动留边），与 CSS 闭合态/悬停终态一致，
    // 否则收尾结束后会有一个留边宽度的瞬移。
    const to = this._dragCloseDistance(dialog)

    const finishClose = () => {
      if (this.controlled) {
        // 保持在闭合位（is-visible 未移除，状态仍 open），等待 Consumer 回写或超时弹回。
        this._applyDragOffset(dialog, to)
      } else {
        // 移除 is-visible 后基础 transform 即闭合位，清内联样式不产生跳变；
        // presence.sync(false) 检测不到 is-visible 会立即完成关闭，不重播退出动画。
        dialog.classList.remove('is-visible')
        this._clearDragStyles(dialog)
      }
      this._closeFromDrag()
    }

    if (this._isReducedMotion() || Math.abs(to - from) < 1) {
      // 与 _settleRebound 的无动画路径对称：自己解除抑制，不依赖调用方清过类。
      dialog.classList.remove('is-dragging')
      finishClose()
      return
    }

    this._startSettle(
      dialog,
      to,
      0,
      this._settleDuration(Math.abs(to - from), velocity),
      SETTLE_EASE_CLOSE,
      finishClose
    )
  }

  // 弹回打开位：从 from 位移回到 0；结束后把内联样式交还 CSS 打开态。
  private _settleRebound(dialog: HTMLDialogElement, velocity: number, from: number) {
    this._dragOffset = 0

    // 收尾结束必须清掉内联 transform，不能像 WAAPI 时代那样保留 0px：
    // translateX(0px) 内联会盖住闭合态 CSS transform，之后用按钮/遮罩/Esc 关闭时
    // 计算值恒为 0、开与关都不再触发过渡。
    const finishRebound = () => {
      this._clearDragStyles(dialog)
    }

    if (this._isReducedMotion() || Math.abs(from) < 1) {
      // 无动画路径：直接移除内联回到 CSS 打开位。CSS 化后计算值就是可信的打开位 0，
      // 不存在 WAAPI fill 覆盖，无需强制 reflow「烘焙」。
      dialog.classList.remove('is-dragging')
      finishRebound()
      return
    }

    this._startSettle(dialog, 0, 1, this._settleDuration(Math.abs(from), velocity), SETTLE_EASE_REBOUND, finishRebound)
  }

  // 释放速度只影响收尾时长：以它走完剩余距离的时间作为估计，慢放长、甩动短。
  private _settleDuration(distance: number, velocity: number): number {
    const ms = (distance / Math.max(Math.abs(velocity), SETTLE_MIN_VELOCITY)) * 1000
    return Math.min(SETTLE_MAX_MS, Math.max(SETTLE_MIN_MS, ms))
  }

  /*
   * 把释放后的收尾交给 CSS transition：写入终值与「时长/缓动」两个内部变量，并在
   * 同一次样式重算里解除抑制（is-dragging → is-settling）。过渡的 before-change
   * style 就是拖拽期间写入的内联值——没有 WAAPI 覆盖层，各引擎采样一致，这正是
   * 相对旧弹簧路径对 Safari「不采信 fill 覆盖」怪癖免疫的原因。
   */
  private _startSettle(
    dialog: HTMLDialogElement,
    offset: number,
    backdropOpacity: number,
    duration: number,
    easing: string,
    onDone: () => void
  ) {
    // 覆盖前先丢弃上一次收尾：否则它的兜底定时器会提前结束这一次的过渡。
    this._abortSettle()
    const sign = this._dragCloseSign
    dialog.style.setProperty('--wui-internal-settle-duration', `${duration}ms`)
    dialog.style.setProperty('--wui-internal-settle-easing', easing)
    dialog.style.transform =
      this._dragAxis === 'x' ? `translateX(${offset * sign}px)` : `translateY(${offset * sign}px)`
    dialog.style.setProperty('--wui-internal-drag-backdrop-opacity', String(backdropOpacity))
    dialog.classList.add('is-settling')
    dialog.classList.remove('is-dragging')

    this._settleFinish = onDone
    // 终值与当前值相同时不会派发 transitionend（也没有可见变化），用定时器兜底。
    this._settleTimer = setTimeout(() => this._finishSettle(), duration + SETTLE_GRACE_MS)
  }

  // 收尾过渡结束（transitionend 或兜底超时）：先撤 settle 状态再执行收尾。
  private _finishSettle() {
    const finish = this._settleFinish
    if (!finish) return
    this._abortSettle()
    finish()
  }

  // 丢弃进行中的收尾（重新抓取、强制关闭、断连）：只撤状态，不执行收尾回调。
  private _abortSettle() {
    this._settleFinish = null
    if (this._settleTimer !== undefined) {
      clearTimeout(this._settleTimer)
      this._settleTimer = undefined
    }
    const dialog = this.dialog
    if (!dialog) return
    dialog.classList.remove('is-settling')
    dialog.style.removeProperty('--wui-internal-settle-duration')
    dialog.style.removeProperty('--wui-internal-settle-easing')
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
    this._settleRebound(dialog, 0, this._dragCloseDistance(dialog))
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
    this._abortSettle()
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
          this._settleRebound(dialog, 0, this._dragCloseDistance(dialog))
        }
      }
      // 关闭且无进行中的拖拽/收尾时，清理可能残留的内联拖拽样式（如收尾路径写在
      // 打开位的 translateX(0px)）。若不清理，0px 内联会盖住闭合态 CSS transform，
      // 后续开/关都不再触发过渡。收尾进行中由 _finishSettle 自行收尾，这里丢弃它
      // 以免回调回头写内联与关闭管线竞争。
      if (!this.open && !this._isDragging()) {
        this._abortSettle()
        const dialog = this.dialog
        if (dialog) this._clearDragStyles(dialog)
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
    // transitionend 会从后代元素冒泡上来（slotted 消费者内容、嵌套子 drawer）。
    // 只处理 dialog 自身的事件：presence 与收尾都只认本层 dialog 的过渡，
    // 后代一条 transform 过渡结束不能提前终结本层收尾（与 presence 内部守卫同规则）。
    if (e.target !== e.currentTarget) return
    this._presence.handleTransitionEnd(e)

    // 收尾过渡结束：::backdrop 的 opacity 过渡 target 也是 dialog（带 pseudoElement），
    // 因此再按 propertyName 只认 transform。
    if (e.propertyName === 'transform') this._finishSettle()
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
    // 关闭态下的 close 事件只可能是我们自己 finishClosing 排队的异步事件（或冗余的
    // 外部关闭）：交给 presence 消费 self-close 标志，避免标志泄漏到下一次真实关闭。
    if (!this.open) {
      this._presence.handleNativeClose()
      return
    }

    // 我们自己 dialog.close() 排队的 close 事件是异步任务：正常时序在本关闭会话内
    // 到达，快速「关闭→重开」时它在重新打开之后才到达（过期事件）。两种情况都已在
    // finishClosing 完成全部清理，由 presence 消费并返回 true，不能当成外部关闭把
    // 刚重开的 dialog 关掉——否则重开即被误关，表现为连续开关丢失过渡动画。
    if (this._presence.handleNativeClose()) return

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
    dispatchOpenChangeEvent(this, open)
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
                          <web-ui-icon size="14" .icon=${oouiClose}></web-ui-icon>
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
