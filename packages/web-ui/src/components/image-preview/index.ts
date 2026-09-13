import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import '@/components/button'
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideChevronLeft, lucideChevronRight, lucideMinus, lucidePlus, oouiClose, radixIconsReset } from '@/icons'
import { attachDragGesture, type DragGestureHandle } from '@/shared/gesture/drag-gesture'
import { clamp } from '@/shared/gesture/physics'
import {
  attachPinchGesture,
  type PinchGestureHandle,
  type PinchMoveInfo,
  type PinchStartInfo
} from '@/shared/gesture/pinch-gesture'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'
import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

import style from './style.css?inline'

export interface ImagePreviewItem {
  src: string
  /** 无障碍替代文本；也用于图片加载失败时的回退展示。 */
  alt?: string
}

export interface ImagePreviewOptions {
  images: ImagePreviewItem[]
  /** 初始图片索引，越界时钳制到有效区间。默认 0。 */
  index?: number
  /** 首尾循环切换。默认 true。 */
  loop?: boolean
  /** 用于解析最近 web-ui-theme 作用域的触发元素。 */
  target?: Element
  /** 显式挂载容器，优先级高于 target 和主题作用域。 */
  container?: HTMLElement
  /** 展示上一张 / 下一张按钮；仅在图片多于一张时渲染。默认 false。 */
  nav?: boolean
  /** 展示缩放工具条。默认 false。 */
  toolbar?: boolean
  /** 展示关闭按钮。默认 false。 */
  closable?: boolean
  /** 展示「当前 / 总数」指示器。默认 false。 */
  indicator?: boolean
  /**
   * 1x 且图片多于一张时，允许左右滑动切换图片：该手势接管横向分量，纵向仍然平移。
   * 放大后拖拽一律平移、不再切图。默认 false。
   */
  swipe?: boolean
  /** 打开期间不锁定页面滚动，语义与 `<web-ui-dialog>` 的 `noScrollLock` 一致。默认 false。 */
  noScrollLock?: boolean
  /** 点击图片以外的空白区域不关闭，语义与 `<web-ui-dialog>` 的 `noBackdropClose` 一致。默认 false。 */
  noBackdropClose?: boolean
}

export interface ImagePreviewHandle {
  /** 当前图片索引；关闭后仍保留最后一次的值。 */
  readonly index: number
  /** 当前缩放倍率，区间 [1, 4]；切换图片时重置为 1。 */
  readonly scale: number
  readonly images: readonly ImagePreviewItem[]
  /** 退场过渡结束、宿主已从 DOM 移除后兑现。 */
  readonly closed: Promise<void>
  next(): void
  prev(): void
  goTo(index: number): void
  zoomIn(): void
  zoomOut(): void
  resetZoom(): void
  close(): void
}

type ResolvedImagePreviewOptions = Required<Omit<ImagePreviewOptions, 'target' | 'container'>>

const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_STEP = 0.5
// 滚轮 deltaY(px) 到缩放的指数系数；每 120px 步进约放大 27%。
const WHEEL_ZOOM_SENSITIVITY = 0.002
// 判定为拖拽（平移或滑动）而非点击的最小位移。
const PAN_MOVE_THRESHOLD = 3
// 滑动切图的最小位移与甩动速度，任一满足即切图。
const SWIPE_DISTANCE = 48
const SWIPE_VELOCITY = 320
// 滑入/回位的兜底时长：正常由 transform 的 transitionend 提前收尾；jsdom、无过渡
// （prefers-reduced-motion）等场景没有 transitionend，按该时长兜底提交。
const SWIPE_SETTLE_MS = 320

/**
 * 图像预览的内部宿主。对外只通过 `imagePreview()` 使用，因此不导出类、
 * 不注册 `HTMLElementTagNameMap`，避免形成声明式标签契约。
 *
 * 内部使用原生 `<dialog>.showModal()`，与 `<web-ui-dialog>` 共享
 * `native-dialog-presence` 与 `scroll-lock` 两个底层插件，而不是复用该组件：
 * 本组件需要自身铺满视口的 dialog（遮罩即 dialog 背景）与自有指针交互，
 * 与 dialog 组件的玻璃卡片 / 插槽契约不同源。
 */
@customElement('web-ui-image-preview')
class WebUiImagePreview extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ attribute: false }) images: ImagePreviewItem[] = []
  @property({ attribute: false }) loop = true
  @property({ attribute: false }) nav = false
  @property({ attribute: false }) toolbar = false
  @property({ attribute: false }) closable = false
  @property({ attribute: false }) indicator = false
  @property({ attribute: false }) swipe = false
  @property({ attribute: false }) noScrollLock = false
  @property({ attribute: false }) noBackdropClose = false

  @state() private _open = false
  @state() private _index = 0
  @state() private _scale = MIN_SCALE
  @state() private _offsetX = 0
  @state() private _offsetY = 0
  /** 滑动跟手位移，只作用于左右方向；可叠加在平移位移之上。 */
  @state() private _swipeOffset = 0
  /** 滑入/回位过渡中：stage 挂 is-settling，启用轨道 transform 过渡。 */
  @state() private _swipeSettling = false
  @state() private _dragging = false

  /** 已加载完成的图片 src 集合；每张图首次 load/error 后淡入，切换回已加载图不再闪烁。 */
  private _loadedSources = new Set<string>()

  /** 相邻图方向：1 = 下一张（位于右侧），-1 = 上一张（位于左侧）。非响应式，随 _swipeOffset 一同更新。 */
  private _swipeDir: 1 | -1 | 0 = 0
  private _swipeSettleCommit = false
  private _swipeSettleDir: 1 | -1 = 1
  private _swipeSettleTimer: ReturnType<typeof setTimeout> | undefined

  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this._open
  })

  private _dismissed = false
  private _gesture: DragGestureHandle | undefined
  private _swipeGesture = false
  private _panOriginX = 0
  private _panOriginY = 0
  private _dragged = false
  private _blankPointerDown = false
  private _pinch: PinchGestureHandle | undefined
  /** 双指手势起始倍率，以及起始两指中点所对应的图片局部（1x）坐标。 */
  private _pinchScale = MIN_SCALE
  private _pinchLocalX = 0
  private _pinchLocalY = 0

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  private get _stage() {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-image-preview-stage') ?? null
  }

  private get _image() {
    return (
      this.shadowRoot?.querySelector<HTMLImageElement>(
        '.wui-image-preview-slide.is-current .wui-image-preview-image'
      ) ?? null
    )
  }

  get index(): number {
    return this._index
  }

  get scale(): number {
    return this._scale
  }

  configure(options: ResolvedImagePreviewOptions): void {
    this.images = options.images
    this.loop = options.loop
    this.nav = options.nav
    this.toolbar = options.toolbar
    this.closable = options.closable
    this.indicator = options.indicator
    this.swipe = options.swipe
    this.noScrollLock = options.noScrollLock
    this.noBackdropClose = options.noBackdropClose
    this._index = clamp(options.index, 0, Math.max(0, options.images.length - 1))
  }

  show(): void {
    if (this._open) return
    this._dismissed = false
    this._open = true
  }

  close(): void {
    if (!this._open) return
    this._endGesture()
    this._open = false
  }

  goTo(target: number): void {
    const count = this.images.length
    if (count === 0) return

    const next = this.loop ? ((target % count) + count) % count : clamp(target, 0, count - 1)
    if (next === this._index) return

    this._index = next
    this.resetZoom()
    // 轨道渲染所有图：目标图若已加载直接展示（无淡入闪烁），未加载由图自身 load 淡入。
  }

  next(): void {
    this.goTo(this._index + 1)
  }

  prev(): void {
    this.goTo(this._index - 1)
  }

  zoomIn(): void {
    this._setScale(this._scale + ZOOM_STEP)
  }

  zoomOut(): void {
    this._setScale(this._scale - ZOOM_STEP)
  }

  resetZoom(): void {
    if (this._scale === MIN_SCALE && this._offsetX === 0 && this._offsetY === 0) return
    this._scale = MIN_SCALE
    this._offsetX = 0
    this._offsetY = 0
  }

  protected override firstUpdated() {
    const stage = this._stage
    if (!stage) return

    this._pinch = attachPinchGesture(stage, {
      onStart: this._handlePinchStart,
      onMove: this._handlePinchMove,
      onEnd: this._handlePinchEnd,
      onCancel: this._handlePinchCancel
    })
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('_open')) {
      this._presence.sync(this._open)
      // 无原生 dialog 支持或 dialog 未能打开时不会收到 close 事件，这里补齐退场结算。
      if (!this._open && !this.dialog?.open) queueMicrotask(() => this._notifyDismissed())
    }
    if (props.has('_open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._endGesture()
    this._pinch?.destroy()
    this._pinch = undefined
    this._presence.dispose()
    this._scrollLock.release()
  }

  private _syncScrollLock() {
    this._scrollLock.sync(this._open && !this.noScrollLock)
  }

  private _notifyDismissed() {
    if (this._dismissed || this._open) return
    this._dismissed = true
    this.dispatchEvent(new CustomEvent('preview-dismissed'))
  }

  /**
   * 以锚点缩放：锚点是相对舞台中心的偏移，它覆盖的图片内容在缩放前后保持不动。
   * 滚轮传光标位置，两指传两指中点，工具栏与键盘传 (0, 0)（即视口中心）。
   */
  private _zoomAt(next: number, anchorX: number, anchorY: number) {
    const scale = clamp(next, MIN_SCALE, MAX_SCALE)
    if (scale === this._scale) return

    const ratio = scale / this._scale
    this._applyScale(scale, anchorX - (anchorX - this._offsetX) * ratio, anchorY - (anchorY - this._offsetY) * ratio)
  }

  private _applyScale(scale: number, offsetX: number, offsetY: number) {
    this._scale = scale
    if (scale === MIN_SCALE) {
      this._offsetX = 0
      this._offsetY = 0
      return
    }
    this._offsetX = offsetX
    this._offsetY = offsetY
    this._clampOffsets()
  }

  private _setScale(next: number) {
    this._zoomAt(next, 0, 0)
  }

  /** 舞台中心的视口坐标；所有缩放锚点都以它为原点。 */
  private _stageOrigin(): { x: number; y: number } {
    const stage = this._stage
    if (!stage) return { x: 0, y: 0 }
    const rect = stage.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }

  /**
   * 平移边界 = 图片与舞台在缩放后「尺寸差」的一半。
   *
   * 图片比舞台大时它是「能露出多少边缘」，比舞台小时它是「能在视口内移动多远」——
   * 两种情形是同一个绝对差，所以 1x 也能拖动，且图片永远拖不出视口。
   * 图片只受 max-width/max-height 收缩（不放大），因此 offsetWidth/offsetHeight
   * 就是绘制尺寸，不受 CSS transform 影响。
   */
  private _offsetBounds(): { x: number; y: number } {
    const stage = this._stage
    const image = this._image
    if (!stage || !image) return { x: 0, y: 0 }

    const width = image.offsetWidth
    const height = image.offsetHeight
    if (!width || !height) return { x: 0, y: 0 }

    return {
      x: Math.abs(width * this._scale - stage.clientWidth) / 2,
      y: Math.abs(height * this._scale - stage.clientHeight) / 2
    }
  }

  /** 当前是否存在位移。1x 也能平移，因此「重置缩放」是否可用不能只看倍率。 */
  private get _isPanned() {
    return this._offsetX !== 0 || this._offsetY !== 0
  }

  private _clampOffsets() {
    const bounds = this._offsetBounds()
    this._offsetX = clamp(this._offsetX, -bounds.x, bounds.x)
    this._offsetY = clamp(this._offsetY, -bounds.y, bounds.y)
  }

  /**
   * 空白 = dialog 本体或未被图片 / 控件覆盖的舞台区域。
   *
   * 只能在 pointerdown（指针捕获生效前）判定：一旦舞台通过 setPointerCapture
   * 取得捕获，后续 click 的 target 会被重定向到舞台，用它判断会把「点图片」
   * 误判成「点空白」而关闭浮层。
   */
  private _isBlank(target: EventTarget | null): boolean {
    return target === this.dialog || target === this._stage
  }

  private _handleImageSettled = (event: Event) => {
    const image = event.currentTarget as HTMLImageElement | null
    if (!image) return
    this._loadedSources.add(image.src)
    this.requestUpdate()
  }

  private _handleCancel = (event: Event) => {
    // 保留 top layer 直到退出过渡完成，避免原生关闭跳过退出动画。
    event.preventDefault()
    this.close()
  }

  private _handleNativeClose = () => {
    this._notifyDismissed()
  }

  private _handleTransitionEnd = (event: TransitionEvent) => {
    this._presence.handleTransitionEnd(event)
  }

  private _handleKeydown = (event: KeyboardEvent) => {
    if (!this._open || event.defaultPrevented) return
    if (event.altKey || event.ctrlKey || event.metaKey) return

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        this.prev()
        break
      case 'ArrowRight':
        event.preventDefault()
        this.next()
        break
      case '+':
      case '=':
        event.preventDefault()
        this.zoomIn()
        break
      case '-':
      case '_':
        event.preventDefault()
        this.zoomOut()
        break
      case '0':
        event.preventDefault()
        this.resetZoom()
        break
      default:
        break
    }
  }

  private _handleWheel = (event: WheelEvent) => {
    if (!this._open) return

    event.preventDefault()
    // deltaMode 1 为按行滚动（Firefox），折算成像素后再套用同一系数。
    const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY
    const origin = this._stageOrigin()
    this._zoomAt(
      this._scale * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY),
      event.clientX - origin.x,
      event.clientY - origin.y
    )
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._open) return

    const blank = this._blankPointerDown
    this._blankPointerDown = false
    if (!blank) return

    // detail 为 0 表示这次 click 不来自指针（键盘激活按钮、程序化 .click()），
    // 此时 pointerdown 起点可能是上一次指针交互的残留，不能据此判定遮罩点击。
    if (event.detail === 0) return

    // 拖拽（平移或滑动）结束后的 click 不再当作遮罩点击。
    if (this._dragged) {
      this._dragged = false
      return
    }
    if (this.noBackdropClose) return
    this.close()
  }

  private _handleDoubleClick = (event: MouseEvent) => {
    if (!this._open || event.target !== this._image) return
    if (this._scale > MIN_SCALE) this.resetZoom()
    else this._setScale(MAX_SCALE / 2)
  }

  /**
   * 双指接管时先中止可能已开始的单指平移/滑动，避免两套手势同时写 offset。
   * 手势起点在图片上的位置被记住，缩放与两指中点位移都以它为基准。
   */
  private _handlePinchStart = (info: PinchStartInfo) => {
    if (!this._open) return

    this._endGesture()
    this._dragging = true
    // 双指操作后浏览器不会补发 click，但混合输入的兼容 click 不应被当作遮罩点击。
    this._dragged = true

    const origin = this._stageOrigin()
    this._pinchScale = this._scale
    this._pinchLocalX = (info.centerX - origin.x - this._offsetX) / this._scale
    this._pinchLocalY = (info.centerY - origin.y - this._offsetY) / this._scale
  }

  private _handlePinchMove = (info: PinchMoveInfo) => {
    if (!this._open) return

    const scale = clamp(this._pinchScale * info.ratio, MIN_SCALE, MAX_SCALE)
    const origin = this._stageOrigin()
    this._applyScale(
      scale,
      info.centerX - origin.x - this._pinchLocalX * scale,
      info.centerY - origin.y - this._pinchLocalY * scale
    )
  }

  private _handlePinchEnd = () => {
    this._dragging = false
  }

  private _handlePinchCancel = () => {
    this._dragging = false
  }

  private _endGesture() {
    this._gesture?.destroy()
    this._gesture = undefined
    this._dragging = false
    this._cancelSwipeSettle()
    this._swipeDir = 0
    this._swipeOffset = 0
  }

  /** 轮播滑动的相邻图索引；loop 环绕，非 loop 越界返回 -1（表示没有可滑入的图）。 */
  private _adjacentIndex(dir: 1 | -1): number {
    const count = this.images.length
    if (count === 0) return -1
    if (this.loop) return (((this._index + dir) % count) + count) % count
    const target = this._index + dir
    return target >= 0 && target < count ? target : -1
  }

  /** 取消未完成的滑入/回位过渡（新手势、pointercancel、关闭等接管时）。 */
  private _cancelSwipeSettle() {
    if (this._swipeSettleTimer !== undefined) {
      clearTimeout(this._swipeSettleTimer)
      this._swipeSettleTimer = undefined
    }
    this._swipeSettling = false
    this._swipeSettleCommit = false
    this._swipeSettleDir = 1
  }

  /** 滑入/回位过渡结束：按目标提交索引切换，或复位到单图静止态。 */
  private _finishSwipeSettle() {
    if (this._swipeSettleTimer === undefined) return
    clearTimeout(this._swipeSettleTimer)
    this._swipeSettleTimer = undefined
    const commit = this._swipeSettleCommit
    const dir = this._swipeSettleDir
    this._swipeSettling = false
    this._swipeSettleCommit = false
    this._swipeDir = 0
    this._swipeOffset = 0
    if (commit) this._commitSwipeTo(dir)
  }

  /** 把当前索引切换到相邻图；相邻图在滑动期间已在 DOM 中呈现，提交后直接以已加载态展示，避免重复淡入闪烁。 */
  private _commitSwipeTo(dir: 1 | -1) {
    const target = this._adjacentIndex(dir)
    if (target < 0 || target === this._index) return
    this._index = target
    this.resetZoom()
  }

  /** 释放后的滑入/回位：把 _swipeOffset 从跟手位移过渡到目标位（越界滑入相邻图，否则回 0）。 */
  private _settleSwipe(deltaX: number, velocityX: number) {
    const dir = this._swipeDir
    const stageW = this._stage?.clientWidth ?? 0
    if (dir === 0 || stageW <= 0) {
      // 无横向位移或无布局（jsdom）：直接复位。
      this._swipeOffset = 0
      return
    }
    const crossed = Math.abs(deltaX) >= SWIPE_DISTANCE || Math.abs(velocityX) >= SWIPE_VELOCITY
    const commit = crossed && this._adjacentIndex(dir) !== -1
    this._swipeSettling = true
    this._swipeSettleCommit = commit
    this._swipeSettleDir = dir
    // 过渡目标：越过阈值 → 轨道再滑一个舞台宽度让相邻图入位（相邻图本就在 ±100% 处，
    // 提交后新当前图回到轨道原点，视觉位置不变、无跳变）；否则弹回原位。
    this._swipeOffset = commit ? -dir * stageW : 0
    this._swipeSettleTimer = setTimeout(() => this._finishSwipeSettle(), SWIPE_SETTLE_MS)
  }

  private _handleSwipeSettleEnd = (event: TransitionEvent) => {
    if (!this._swipeSettling || event.propertyName !== 'transform') return
    this._finishSwipeSettle()
  }

  private _panTo(deltaX: number, deltaY: number) {
    const bounds = this._offsetBounds()
    this._offsetX = clamp(this._panOriginX + deltaX, -bounds.x, bounds.x)
    this._offsetY = clamp(this._panOriginY + deltaY, -bounds.y, bounds.y)
  }

  /**
   * 平移与左右滑动共用 `attachDragGesture`：它把指针捕获推迟到确认拖拽之后，
   * 因此不会像立即捕获那样破坏图片自身的 click / dblclick 命中；
   * 拖拽过程中的窗口级监听同时兜住指针移出元素甚至移出视口的情况。
   *
   * 拖拽默认平移且不限方向，与倍率无关：放大后是查看被裁切的边缘，1x 是在视口内
   * 移动图片。唯一的例外是 `swipe` 独占 1x——未放大、开启 swipe 且多于一张图时，
   * 横向拖拽归切图，此时不做平移。鼠标按住拖拽与单指拖拽走的是同一条 Pointer 路径。
   *
   * 监听挂在 dialog 而非舞台上：控件层里的按下不会经过舞台，挂在舞台会漏掉
   * 这些按下而留下过期的「起于空白」标记。
   */
  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._open) return

    // 新手势接管：中止可能未完成的滑入/回位过渡并复位轮播状态。
    this._cancelSwipeSettle()
    this._swipeDir = 0
    this._swipeOffset = 0

    // 只有主指针左键才可能生成 click；副指针或其它键的按下不产生 click，
    // 若让它们覆盖标记，主指针随后释放时的 click 会拿副指针的命中结果误判遮罩点击。
    const primary = event.button === 0 && event.isPrimary !== false
    if (!primary) return

    // 指针捕获会把后续 click 的 target 重定向到捕获元素，因此在按下时（捕获生效前）
    // 记录真实命中元素，作为「是否起于空白区域」的唯一判据。
    this._blankPointerDown = this._isBlank(event.target)
    this._dragged = false

    const stage = this._stage
    if (!stage || (event.target !== stage && !stage.contains(event.target as Node))) return

    // swipe 独占 1x：只有未放大、开启 swipe 且多于一张图时，横向拖拽才归切图；
    // 其余情形拖拽一律平移，且不限方向（边界见 _offsetBounds）。
    this._swipeGesture = this._scale === MIN_SCALE && this.swipe && this.images.length > 1
    this._panOriginX = this._offsetX
    this._panOriginY = this._offsetY

    this._gesture?.destroy()
    this._gesture = attachDragGesture(event, {
      // 不能用 axis: 'x'：那会把以纵向为主的拖拽整体判定为「取消」，1x 下纵向就
      // 无法平移了。这里始终按 both 追踪，让 swipe 只接管横向分量。
      axis: 'both',
      threshold: PAN_MOVE_THRESHOLD,
      onMove: info => {
        if (this._swipeGesture) {
          // 横向跟手位移驱动轨道整体平移（单轨道轮播），纵向仍然平移；
          // 方向随拖拽符号更新，轨道位移随 _swipeOffset 反转时自然换向。
          this._swipeOffset = info.deltaX
          if (info.deltaX !== 0) this._swipeDir = info.deltaX < 0 ? 1 : -1
          this._panTo(0, info.deltaY)
        } else this._panTo(info.deltaX, info.deltaY)
      },
      onEnd: info => {
        this._dragged = true
        this._dragging = false
        if (this._swipeGesture) this._settleSwipe(info.deltaX, info.velocityX)
      },
      onTap: () => {
        this._dragging = false
      },
      onCancel: () => {
        this._dragging = false
        this._cancelSwipeSettle()
        this._swipeDir = 0
        this._swipeOffset = 0
      }
    })
    this._dragging = true
  }

  override render() {
    const count = this.images.length
    const zoomed = this._scale > MIN_SCALE
    // 单轨道轮播（相邻图渲染）：轨道只放当前图与左右相邻，当前图恒在轨道原点。
    // 相邻图用绝对定位放在 ±100%（= 舞台宽度）处，与当前图同尺寸同基线；loop
    // 环绕时首尾相邻恒在两侧，任何索引拖拽（含首尾环绕）相邻图都真实跟手，不会
    // 出现「越过轨道末端滑空」的空白（全量渲染轨道在 last→first 环绕时相邻图在
    // 远端，拖拽中间态必然空白）。
    // 轨道整体随 _swipeOffset 平移：松手越过阈值再滑一个舞台宽度让相邻图入位，
    // 否则弹回原点。图片自身只负责平移/缩放（swipe 只动轨道、不碰图片 transform，
    // 缩放锚点数学不变）。
    const prevIndex = count > 0 ? this._adjacentIndex(-1) : -1
    const nextIndex = count > 0 ? this._adjacentIndex(1) : -1
    const trackTransform = `translate3d(${this._swipeOffset}px, 0, 0)`
    // 缩放/平移只作用于当前图的 img：相邻 slide 永远 1x（scale(1)），放大态连纵向 pan
    // 也不跟随（pan 只动当前图），避免放大后相邻图被带大/带进视口「穿过来」。
    // 1x 时相邻图共享纵向 pan（offsetY），保持拖拽斜向时行内对齐——swipe 行为与上一轮一致。
    const imageTransform = `translate3d(${this._offsetX}px, ${this._offsetY}px, 0) scale(${this._scale})`
    const neighborTransform = zoomed
      ? 'translate3d(0, 0, 0) scale(1)'
      : `translate3d(0, ${this._offsetY}px, 0) scale(1)`

    return html`
      <dialog
        aria-label="图片预览"
        @cancel=${this._handleCancel}
        @close=${this._handleNativeClose}
        @pointerdown=${this._handlePointerDown}
        @click=${this._handleClick}
        @dblclick=${this._handleDoubleClick}
        @keydown=${this._handleKeydown}
        @wheel=${this._handleWheel}
        @transitionend=${this._handleTransitionEnd}
      >
        <div
          class=${classMap({
            'wui-image-preview-stage': true,
            'is-zoomed': zoomed,
            'is-dragging': this._dragging,
            'is-settling': this._swipeSettling
          })}
        >
          <div
            class="wui-image-preview-track"
            style=${styleMap({ transform: trackTransform })}
            @transitionend=${this._handleSwipeSettleEnd}
          >
            ${
              prevIndex >= 0
                ? html`
                    <div class="wui-image-preview-slide is-prev" aria-hidden="true">
                      <img
                        class=${classMap({
                          'wui-image-preview-image': true,
                          'is-loaded': this._loadedSources.has(this.images[prevIndex].src)
                        })}
                        src=${this.images[prevIndex].src}
                        alt=${this.images[prevIndex].alt ?? ''}
                        draggable="false"
                        style=${styleMap({ transform: neighborTransform })}
                        @load=${this._handleImageSettled}
                        @error=${this._handleImageSettled}
                      />
                    </div>
                  `
                : nothing
            }
            ${
              count > 0
                ? html`
                    <div class="wui-image-preview-slide is-current">
                      <img
                        class=${classMap({
                          'wui-image-preview-image': true,
                          'is-loaded': this._loadedSources.has(this.images[this._index].src)
                        })}
                        src=${this.images[this._index].src}
                        alt=${this.images[this._index].alt ?? ''}
                        draggable="false"
                        style=${styleMap({ transform: imageTransform })}
                        @load=${this._handleImageSettled}
                        @error=${this._handleImageSettled}
                      />
                    </div>
                  `
                : nothing
            }
            ${
              nextIndex >= 0
                ? html`
                    <div class="wui-image-preview-slide is-next" aria-hidden="true">
                      <img
                        class=${classMap({
                          'wui-image-preview-image': true,
                          'is-loaded': this._loadedSources.has(this.images[nextIndex].src)
                        })}
                        src=${this.images[nextIndex].src}
                        alt=${this.images[nextIndex].alt ?? ''}
                        draggable="false"
                        style=${styleMap({ transform: neighborTransform })}
                        @load=${this._handleImageSettled}
                        @error=${this._handleImageSettled}
                      />
                    </div>
                  `
                : nothing
            }
          </div>
        </div>
        <div class="wui-image-preview-controls">
          ${
            this.indicator
              ? html`<span class="wui-image-preview-counter wui-glass" aria-live="polite"
                  >${this._index + 1} / ${count}</span
                >`
              : nothing
          }
          ${
            this.closable
              ? html`
                  <web-ui-button
                    class="wui-image-preview-close"
                    variant="glass"
                    icon
                    size="36"
                    aria-label="关闭"
                    @click=${this.close}
                  >
                    <web-ui-icon size="16" .icon=${oouiClose}></web-ui-icon>
                  </web-ui-button>
                `
              : nothing
          }
          ${
            this.nav && count > 1
              ? html`
                  <web-ui-button
                    class="wui-image-preview-nav wui-image-preview-nav-prev"
                    variant="glass"
                    icon
                    size="44"
                    aria-label="上一张"
                    ?disabled=${!this.loop && this._index === 0}
                    @click=${this.prev}
                  >
                    <web-ui-icon size="20" .icon=${lucideChevronLeft}></web-ui-icon>
                  </web-ui-button>
                  <web-ui-button
                    class="wui-image-preview-nav wui-image-preview-nav-next"
                    variant="glass"
                    icon
                    size="44"
                    aria-label="下一张"
                    ?disabled=${!this.loop && this._index === count - 1}
                    @click=${this.next}
                  >
                    <web-ui-icon size="20" .icon=${lucideChevronRight}></web-ui-icon>
                  </web-ui-button>
                `
              : nothing
          }
          ${
            this.toolbar
              ? html`
                  <div class="wui-image-preview-toolbar wui-glass">
                    <web-ui-button
                      variant="glass"
                      icon
                      size="30"
                      aria-label="缩小"
                      ?disabled=${this._scale <= MIN_SCALE}
                      @click=${this.zoomOut}
                    >
                      <web-ui-icon size="16" .icon=${lucideMinus}></web-ui-icon>
                    </web-ui-button>
                    <span class="wui-image-preview-scale">${Math.round(this._scale * 100)}%</span>
                    <web-ui-button
                      variant="glass"
                      icon
                      size="30"
                      aria-label="放大"
                      ?disabled=${this._scale >= MAX_SCALE}
                      @click=${this.zoomIn}
                    >
                      <web-ui-icon size="16" .icon=${lucidePlus}></web-ui-icon>
                    </web-ui-button>
                    <web-ui-button
                      variant="glass"
                      icon
                      size="30"
                      aria-label="重置缩放"
                      ?disabled=${this._scale <= MIN_SCALE && !this._isPanned}
                      @click=${this.resetZoom}
                    >
                      <web-ui-icon size="16" .icon=${radixIconsReset}></web-ui-icon>
                    </web-ui-button>
                  </div>
                `
              : nothing
          }
        </div>
      </dialog>
    `
  }
}

/**
 * 打开一个命令式图片预览。
 *
 * 组件挂载到目标 `web-ui-theme` 的 overlay 容器（无主题作用域时回退到全局
 * fallback root），返回的句柄是唯一的控制入口。所有展示类选项默认关闭，
 * 默认只渲染图片本身。
 */
export function imagePreview(options: ImagePreviewOptions): ImagePreviewHandle {
  const images = (options.images ?? []).map(item => ({ src: item.src, alt: item.alt ?? '' }))
  if (images.length === 0) {
    throw new Error('[web-ui-image-preview] imagePreview requires at least one image')
  }

  const theme = options.target ? findNearestTheme(options.target) : findRootTheme()
  const container = options.container ?? theme?.getOverlayRoot() ?? getFallbackOverlayRoot()

  const element = document.createElement('web-ui-image-preview') as WebUiImagePreview
  element.configure({
    images,
    index: options.index ?? 0,
    loop: options.loop ?? true,
    nav: options.nav ?? false,
    toolbar: options.toolbar ?? false,
    closable: options.closable ?? false,
    indicator: options.indicator ?? false,
    swipe: options.swipe ?? false,
    noScrollLock: options.noScrollLock ?? false,
    noBackdropClose: options.noBackdropClose ?? false
  })

  let settle: (() => void) | undefined
  const closed = new Promise<void>(resolve => {
    settle = resolve
  })

  element.addEventListener(
    'preview-dismissed',
    () => {
      element.remove()
      settle?.()
      settle = undefined
    },
    { once: true }
  )

  container.appendChild(element)
  element.show()

  return {
    get index() {
      return element.index
    },
    get scale() {
      return element.scale
    },
    get images() {
      return element.images
    },
    get closed() {
      return closed
    },
    next: () => element.next(),
    prev: () => element.prev(),
    goTo: (index: number) => element.goTo(index),
    zoomIn: () => element.zoomIn(),
    zoomOut: () => element.zoomOut(),
    resetZoom: () => element.resetZoom(),
    close: () => element.close()
  }
}
