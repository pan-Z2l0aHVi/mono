import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import '@/components/button'
import '@/components/icon'
import glass from '@/assets/glass.css?inline'
import { lucideChevronLeft, lucideChevronRight, lucideMinus, lucidePlus, lucideRefreshCw, oouiClose } from '@/icons'
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

const MIN_SCALE = 1
const MAX_SCALE = 4
const ZOOM_STEP = 0.5
// 滚轮 deltaY(px) 到缩放的指数系数；每 120px 步进约放大 27%。
const WHEEL_ZOOM_SENSITIVITY = 0.002
// 小于该位移视为点击而非拖拽平移。
const PAN_MOVE_THRESHOLD = 3

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/*
 * Pointer Capture 在部分 DOM 实现（如 jsdom）中缺失，合成事件也可能携带
 * 不活跃的 pointerId。两种情况都不影响冒泡事件继续驱动平移，因此静默降级。
 */
function capturePointer(target: HTMLElement, pointerId: number): void {
  if (typeof target.setPointerCapture !== 'function') return
  try {
    target.setPointerCapture(pointerId)
  } catch {
    // 忽略不具备捕获资格的指针
  }
}

function releasePointer(target: HTMLElement, pointerId: number): void {
  if (typeof target.hasPointerCapture !== 'function' || !target.hasPointerCapture(pointerId)) return
  target.releasePointerCapture(pointerId)
}

/**
 * 图像预览的内部宿主。对外只通过 `imagePreview()` 使用，因此不导出类、
 * 不注册 `HTMLElementTagNameMap`，避免形成声明式标签契约。
 */
@customElement('web-ui-image-preview')
class WebUiImagePreview extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ attribute: false }) images: ImagePreviewItem[] = []
  @property({ attribute: false }) loop = true

  @state() private _open = false
  @state() private _index = 0
  @state() private _scale = MIN_SCALE
  @state() private _offsetX = 0
  @state() private _offsetY = 0
  @state() private _loaded = false
  @state() private _panning = false

  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this._open
  })

  private _dismissed = false
  private _panPointerId: number | null = null
  private _panStartX = 0
  private _panStartY = 0
  private _panOriginX = 0
  private _panOriginY = 0
  private _panMoved = false

  private get dialog() {
    return this.shadowRoot?.querySelector('dialog') ?? null
  }

  private get _stage() {
    return this.shadowRoot?.querySelector<HTMLElement>('.wui-image-preview-stage') ?? null
  }

  private get _image() {
    return this.shadowRoot?.querySelector<HTMLImageElement>('.wui-image-preview-image') ?? null
  }

  get index(): number {
    return this._index
  }

  get scale(): number {
    return this._scale
  }

  configure(options: { images: ImagePreviewItem[]; loop: boolean; index: number }): void {
    this.images = options.images
    this.loop = options.loop
    this._index = clamp(options.index, 0, Math.max(0, options.images.length - 1))
  }

  show(): void {
    if (this._open) return
    this._dismissed = false
    this._open = true
  }

  close(): void {
    if (!this._open) return
    this._open = false
  }

  goTo(target: number): void {
    const count = this.images.length
    if (count === 0) return

    const next = this.loop ? ((target % count) + count) % count : clamp(target, 0, count - 1)
    if (next === this._index) return

    const previousSrc = this.images[this._index]?.src
    this._index = next
    this.resetZoom()
    // 复用同一个 <img>：src 变化时先退回未加载态，由 load 事件淡入。
    if (this.images[next]?.src !== previousSrc) this._loaded = false
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

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('_open')) {
      this._presence.sync(this._open)
      this._scrollLock.sync(this._open)
      // 无原生 dialog 支持或 dialog 未能打开时不会收到 close 事件，这里补齐退场结算。
      if (!this._open && !this.dialog?.open) queueMicrotask(() => this._notifyDismissed())
    }
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._presence.dispose()
    this._scrollLock.release()
  }

  private _notifyDismissed() {
    if (this._dismissed || this._open) return
    this._dismissed = true
    this.dispatchEvent(new CustomEvent('preview-dismissed'))
  }

  private _setScale(next: number) {
    const scale = clamp(next, MIN_SCALE, MAX_SCALE)
    if (scale === this._scale) return

    this._scale = scale
    if (scale === MIN_SCALE) {
      this._offsetX = 0
      this._offsetY = 0
      return
    }
    this._clampOffsets()
  }

  /**
   * 平移边界 = 缩放后图片相对舞台的溢出的一半。
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
      x: Math.max(0, (width * this._scale - stage.clientWidth) / 2),
      y: Math.max(0, (height * this._scale - stage.clientHeight) / 2)
    }
  }

  private _clampOffsets() {
    const bounds = this._offsetBounds()
    this._offsetX = clamp(this._offsetX, -bounds.x, bounds.x)
    this._offsetY = clamp(this._offsetY, -bounds.y, bounds.y)
  }

  private _handleImageSettled = () => {
    this._loaded = true
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
    this._setScale(this._scale * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY))
  }

  private _handleClick = (event: MouseEvent) => {
    if (!this._open) return

    const target = event.target as Node | null
    // 只有空白区域（dialog 本体或舞台自身）是遮罩；命中图片或控件不关闭。
    if (target !== this.dialog && target !== this._stage) return

    // 平移结束后的 click 不再当作遮罩点击。
    if (this._panMoved) {
      this._panMoved = false
      return
    }
    this.close()
  }

  private _handleDoubleClick = (event: MouseEvent) => {
    if (!this._open || event.target !== this._image) return
    if (this._scale > MIN_SCALE) this.resetZoom()
    else this._setScale(MAX_SCALE / 2)
  }

  private _handlePointerDown = (event: PointerEvent) => {
    if (!this._open || this._scale <= MIN_SCALE) return
    if (event.button !== 0 || event.isPrimary === false) return

    const stage = event.currentTarget as HTMLElement
    this._panPointerId = event.pointerId
    this._panStartX = event.clientX
    this._panStartY = event.clientY
    this._panOriginX = this._offsetX
    this._panOriginY = this._offsetY
    this._panMoved = false
    this._panning = true
    capturePointer(stage, event.pointerId)
  }

  private _handlePointerMove = (event: PointerEvent) => {
    if (this._panPointerId !== event.pointerId) return

    const deltaX = event.clientX - this._panStartX
    const deltaY = event.clientY - this._panStartY
    if (!this._panMoved && Math.abs(deltaX) + Math.abs(deltaY) < PAN_MOVE_THRESHOLD) return

    this._panMoved = true
    const bounds = this._offsetBounds()
    this._offsetX = clamp(this._panOriginX + deltaX, -bounds.x, bounds.x)
    this._offsetY = clamp(this._panOriginY + deltaY, -bounds.y, bounds.y)
  }

  private _handlePointerEnd = (event: PointerEvent) => {
    if (this._panPointerId !== event.pointerId) return

    const stage = event.currentTarget as HTMLElement
    this._panPointerId = null
    this._panning = false
    releasePointer(stage, event.pointerId)
  }

  override render() {
    const item = this.images[this._index]
    const count = this.images.length
    const zoomed = this._scale > MIN_SCALE
    const transform = `translate3d(${this._offsetX}px, ${this._offsetY}px, 0) scale(${this._scale})`

    return html`
      <dialog
        aria-label="图片预览"
        @cancel=${this._handleCancel}
        @close=${this._handleNativeClose}
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
            'is-panning': this._panning
          })}
          @pointerdown=${this._handlePointerDown}
          @pointermove=${this._handlePointerMove}
          @pointerup=${this._handlePointerEnd}
          @pointercancel=${this._handlePointerEnd}
        >
          ${
            item
              ? html`
                  <img
                    class=${classMap({ 'wui-image-preview-image': true, 'is-loaded': this._loaded })}
                    src=${item.src}
                    alt=${item.alt ?? ''}
                    draggable="false"
                    style=${styleMap({ transform })}
                    @load=${this._handleImageSettled}
                    @error=${this._handleImageSettled}
                  />
                `
              : nothing
          }
        </div>
        <div class="wui-image-preview-controls">
          <span class="wui-image-preview-counter wui-glass" aria-live="polite">${this._index + 1} / ${count}</span>
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
          ${
            count > 1
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
              ?disabled=${this._scale <= MIN_SCALE}
              @click=${this.resetZoom}
            >
              <web-ui-icon size="16" .icon=${lucideRefreshCw}></web-ui-icon>
            </web-ui-button>
          </div>
        </div>
      </dialog>
    `
  }
}

/**
 * 打开一个命令式图片预览。
 *
 * 组件挂载到目标 `web-ui-theme` 的 overlay 容器（无主题作用域时回退到全局
 * fallback root），返回的句柄是唯一的控制入口。
 */
export function imagePreview(options: ImagePreviewOptions): ImagePreviewHandle {
  const images = (options.images ?? []).map(item => ({ src: item.src, alt: item.alt ?? '' }))
  if (images.length === 0) {
    throw new Error('[web-ui-image-preview] imagePreview requires at least one image')
  }

  const theme = options.target ? findNearestTheme(options.target) : findRootTheme()
  const container = options.container ?? theme?.getOverlayRoot() ?? getFallbackOverlayRoot()

  const element = document.createElement('web-ui-image-preview') as WebUiImagePreview
  element.configure({ images, loop: options.loop ?? true, index: options.index ?? 0 })

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
