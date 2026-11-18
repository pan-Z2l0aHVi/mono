import '@/components/button'
import '@/components/icon'

import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import modalSurface from '@/assets/modal-surface.css?inline'
import glass from '@/classes/glass.css?inline'
import { lucideChevronLeft, lucideChevronRight, lucideMinus, lucidePlus, oouiClose, radixIconsReset } from '@/icons'
import { resolveBuiltinLabelSet } from '@/shared/locale/builtin-labels'
import { defineNativeDialogPresence } from '@/shared/overlay/native-dialog-presence'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { getFallbackOverlayRoot } from '@/shared/overlay/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/overlay/theme-overlay-scope'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import { defineImagePreviewInteraction, MAX_SCALE, MIN_SCALE } from './interaction-controller'
import style from './style.css?inline'

export interface ImagePreviewItem {
  src: string
  /** 无障碍替代文本；也用于图片加载失败时的回退展示。 */
  alt?: string
}

/** imagePreview 的无障碍名成组覆盖；未提供的 key 回退内置英文文案（见 ADR-0016）。 */
export interface ImagePreviewAriaLabels {
  close?: string
  previousImage?: string
  nextImage?: string
  zoomIn?: string
  zoomOut?: string
  resetZoom?: string
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
  /** 展示上一张 / 下一张 button；仅在图片多于一张时渲染。默认 false。 */
  nav?: boolean
  /** 展示缩放工具条。默认 false。 */
  toolbar?: boolean
  /** 展示关闭 button。默认 false。 */
  closable?: boolean
  /** 展示「当前 / 总数」indicator。默认 false。 */
  indicator?: boolean
  /**
   * 1x 且图片多于一张时，允许左右滑动切换图片：该手势接管整个拖拽，纵向位移被忽略
   * （不驱平移、不跟手），横向用于切图。放大后拖拽一律平移（纵横都跟）、不再切图。
   * 默认 false。
   */
  swipe?: boolean
  /** 打开期间不锁定页面滚动，语义与 `<web-ui-dialog>` 的 `noScrollLock` 一致。默认 false。 */
  noScrollLock?: boolean
  /** 点击图片以外的空白区域不关闭，语义与 `<web-ui-dialog>` 的 `noBackdropClose` 一致。默认 false。 */
  noBackdropClose?: boolean
  /** 内置无障碍名成组覆盖；未提供的 key 回退内置英文文案（见 ADR-0016）。 */
  ariaLabels?: ImagePreviewAriaLabels
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

type ResolvedImagePreviewOptions = Required<Omit<ImagePreviewOptions, 'target' | 'container' | 'ariaLabels'>> & {
  ariaLabels?: ImagePreviewAriaLabels
}

/**
 * 图像预览的内部宿主。对外只通过 `imagePreview()` 使用，因此不导出类、
 * 不注册 `HTMLElementTagNameMap`，避免形成声明式 tag 契约。
 *
 * 内部使用原生 `<dialog>.showModal()`，与 `<web-ui-dialog>` 共享
 * `native-dialog-presence` 与 `scroll-lock` 两个底层插件，而不是复用该组件：
 * 本组件需要自身铺满视口的 dialog（backdrop 即 dialog 背景）与自有指针交互，
 * 与 dialog 组件的玻璃卡片 / 插槽契约不同源。
 */
@customElement('web-ui-image-preview')
class WebUiImagePreview extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(modalSurface), unsafeCSS(style)]

  @property({ attribute: false }) images: ImagePreviewItem[] = []
  @property({ attribute: false }) loop = true
  @property({ attribute: false }) nav = false
  @property({ attribute: false }) toolbar = false
  @property({ attribute: false }) closable = false
  @property({ attribute: false }) indicator = false
  @property({ attribute: false }) swipe = false
  @property({ attribute: false }) noScrollLock = false
  @property({ attribute: false }) noBackdropClose = false
  @property({ attribute: false }) ariaLabels?: ImagePreviewAriaLabels

  private readonly _interaction = defineImagePreviewInteraction().make({
    isOpen: () => this._open,
    getDialog: () => this.dialog,
    getStage: () => this._stage,
    getCurrentImage: () => this._image,
    getItems: () => this.images,
    isLooping: () => this.loop,
    isSwipeEnabled: () => this.swipe,
    isBackdropCloseEnabled: () => !this.noBackdropClose,
    requestClose: () => this.close(),
    onViewChange: () => this.requestUpdate()
  })

  @state() private _open = false

  /** 已加载完成的图片 src 集合；每张图首次 load/error 后淡入，切换回已加载图不再闪烁。 */
  private _loadedSources = new Set<string>()

  private readonly _scrollLock = defineScrollLockLease().make()
  /*
   * 开启态 overlay（issue #120 Block 1）。预览的 Escape 交给仲裁者：只走原生 <dialog> 的
   * cancel 事件、自己不参与登记时，它既不是仲裁候选、又指望原生 cancel 兜底，而仲裁者一旦命中
   * 别的层就会 preventDefault 压掉那个 cancel：与任何已登记的层同时打开时，一次 Escape
   * 关掉的是下面那层，最上层的预览留在屏幕上。登记之后它与其它层同处一棵逻辑树。
   *
   * 没有惰性通道：预览没有 `no-escape-close` 这类策略，Escape 恒可关闭（与 `closable`
   * 只管关闭 button 一样，不表达「能否关闭」）。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this.close(),
    isConnected: () => this.isConnected
  })
  private _handle: OpenOverlayHandle | null = null
  private readonly _presence = defineNativeDialogPresence().make({
    getDialog: () => this.dialog,
    isConnected: () => this.isConnected,
    isOpen: () => this._open
  })
  private _dismissed = false

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
    return this._interaction.view.index
  }

  get scale(): number {
    return this._interaction.view.scale
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
    this.ariaLabels = options.ariaLabels
    this._interaction.configure(options.index)
  }

  show(): void {
    if (this._open) return
    this._dismissed = false
    this._open = true
  }

  close(): void {
    if (!this._open) return
    this._interaction.abort()
    this._open = false
  }

  goTo(index: number): void {
    this._interaction.goTo(index)
    // track 渲染所有图：目标图若已加载直接展示（无淡入闪烁），未加载由图自身 load 淡入。
  }

  next(): void {
    this._interaction.next()
  }

  prev(): void {
    this._interaction.prev()
  }

  zoomIn(): void {
    this._interaction.zoomIn()
  }

  zoomOut(): void {
    this._interaction.zoomOut()
  }

  resetZoom(): void {
    this._interaction.resetZoom()
  }

  override connectedCallback() {
    super.connectedCallback()
    // 重挂载对账：断连时 presence 与滚动锁已被 dispose/release，而 `_open` 未变化时
    // `updated()` 不会补跑任何 sync 分支。首次连接时 shadow 尚未渲染、`this.dialog`
    // 为 null，reconcile 内部直接返回；打开态的首次进入仍由 updated() 的
    // `props.has('_open')` 分支处理。
    this._presence.reconcile()
    this._syncScrollLock()
    this._interaction.syncPinch()
    this._reclaimIfOpen()
  }

  /*
   * 「重挂载恢复」的调用方一半：模块刻意不观察 DOM 连接状态，所以断连撤销登记之后，
   * 重连时仍有开启态就必须由组件重新声明。首次连接时 shadow 尚未渲染、`this.dialog`
   * 为 null，直接跳过；打开态的首次进入仍由 updated() 的 `props.has('_open')` 分支处理。
   */
  private _reclaimIfOpen() {
    if (!this._open || this._handle) return
    const dialog = this.dialog
    if (!dialog) return
    this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
  }

  protected override firstUpdated() {
    this._interaction.syncPinch()
  }

  protected override updated(props: PropertyValues) {
    super.updated(props)
    if (!this.isConnected) return

    if (props.has('_open')) {
      this._presence.sync(this._open)
      if (this._open) {
        // presence.sync 内的 showModal() 把 dialog 提升进 top layer，和 dialog /
        // drawer 走同一条路径。dialog / drawer 上实测到的机制是：双击手势留下的活选区
        // 会被浏览器拿去和提升后的新布局重新解析，落进刚挂载的 panel 正文。脆弱的是
        // 「手势来源的活选区」，不是 dblclick 的判定窗口（把打开推迟 250ms 仍复现）；
        // 选区由浏览器在 showModal() 调用内部生成，脚本没有任何 Selection API 调用，
        // 在 dblclick 上 preventDefault 也拦不住。
        //
        // 但**双击路径在本组件上不复现**：预览层自身是 user-select: none（见
        // style.css），重解析拿不到可落的文本。实测 native showModal() 刚返回时
        // 选区本就是 rangeCount === 0，既没有可见高亮，也没有残留的塌陷 range；
        // 且这与触发目标本身无关——换成一块可选中文本 div 当触发目标，仍是 0。
        //
        // 真正让这一行有意义的是另一条事实：showModal() 不会动打开前就已存在的选区。
        // 所以它清的是「先选中页面文本、再打开预览」这条路径，属防御性清理，同时让
        // 三个组件的打开行为保持一致（dialog / drawer 上这行是真修复，本组件上是
        // 兜底）。这里只清文档选区，不动 user-select。
        window.getSelection()?.removeAllRanges()
      }
      // 原生 dialog 登记为开启态 overlay：Escape 仲裁据此判出最内层（issue #120 Block 1）。
      const dialog = this.dialog
      if (dialog) {
        if (this._open) {
          // 同一 panel 重新 claim = 新的一次开启：旧会话整体作废。
          this._handle?.release()
          this._handle = this._overlay.claim(dialog, { ancestryFrom: this })
        } else {
          this._handle?.release()
          this._handle = null
        }
      }
      // 无原生 dialog 支持或 dialog 未能打开时不会收到 close 事件，这里补齐退场结算。
      if (!this._open && !this.dialog?.open) queueMicrotask(() => this._notifyDismissed())
    }
    if (props.has('_open') || props.has('noScrollLock')) this._syncScrollLock()
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._interaction.destroy()
    this._presence.dispose()
    this._scrollLock.release()
    // 断连即撤销登记：层不留在全局注册表里，重连后由 _reclaimIfOpen 显式重新声明。
    this._handle?.release()
    this._handle = null
  }

  private _syncScrollLock() {
    this._scrollLock.sync(this._open && !this.noScrollLock)
  }

  private _notifyDismissed() {
    if (this._dismissed || this._open) return
    this._dismissed = true
    this.dispatchEvent(new CustomEvent('preview-dismissed'))
  }

  private _handleImageSettled = (event: Event) => {
    const image = event.currentTarget as HTMLImageElement | null
    if (!image) return
    this._markLoaded(image)
    this.requestUpdate()
  }

  /**
   * 登记加载完成的图片，键与 render 侧 `is-loaded` 的查询同源。
   *
   * 不能用 `image.src`：那是 IDL 属性，返回**相对 src 解析后的绝对 URL**，而查询用的是
   * `this.images[i].src`（调用方原始串）。相对 src 下两者永不相等 → `is-loaded` 永不
   * 施加 → 图片停在 `opacity: 0`，尽管 img 早已 `complete`。
   *
   * 所属下标由模板写在 `data-index` 上（与该 img 的 `src` 出自同一处）。当前图与
   * 相邻图的 `<img>` 跨切图复用，理论上存在「旧图的 error 在属性更新后到达」的
   * 低概率错位；改 `src` 通常会中止旧请求，因此未做额外防护。
   */
  private _markLoaded(image: HTMLImageElement): void {
    const src = this.images[Number(image.dataset.index)]?.src
    if (src !== undefined) this._loadedSources.add(src)
  }

  /*
   * 登记之后 Escape 由仲裁者接管（它在 capture 阶段 preventDefault，UA 因此不再派发原生
   * cancel），但本 handler **不可删**：任何到达 dialog 的 cancel 都要 preventDefault，
   * 把 top layer 保留到视觉退场结束，否则原生关闭会跳过退出动画。jsdom 与重挂载用例
   * 正是直接派发 cancel 来压这条断言。
   */
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

  override render() {
    const count = this.images.length
    const { index, prevIndex, nextIndex, scale, offsetX, offsetY, swipeOffset, swipeSettling, dragging } =
      this._interaction.view
    const zoomed = scale > MIN_SCALE
    const panned = offsetX !== 0 || offsetY !== 0
    // 单 track 轮播（相邻图渲染）：track 只放当前图与左右相邻，当前图恒在 track 原点。
    // 相邻图用绝对定位放在 ±100%（= 舞台宽度）处，与当前图同尺寸同基线；loop
    // 环绕时首尾相邻恒在两侧，任何索引拖拽（含首尾环绕）相邻图都真实跟手，不会
    // 出现「越过 track 末端滑空」的空白（全量渲染 track 在 last→first 环绕时相邻图在
    // 远端，拖拽中间态必然空白）。
    // track 整体随 swipeOffset 平移：松手越过阈值再滑一个舞台宽度让相邻图入位，
    // 否则弹回原点。图片自身只负责平移/缩放（swipe 只动 track、不碰图片 transform，
    // 缩放锚点数学不变）。
    const trackTransform = `translate3d(${swipeOffset}px, 0, 0)`
    // 缩放/平移只作用于当前图的 img：相邻 slide 永远 1x（scale(1)），放大态连纵向 pan
    // 也不跟随（pan 只动当前图），避免放大后相邻图被带大/带进视口「穿过来」。
    // 1x 非 swipe 的平移路径仍可纵向拖拽，相邻图共享 offsetY 保持行内对齐；swipe 生效
    // 期间纵向 delta 被忽略（offsetY 恒 0），相邻图同样不产生纵向跟手。
    const imageTransform = `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`
    const neighborTransform = zoomed ? 'translate3d(0, 0, 0) scale(1)' : `translate3d(0, ${offsetY}px, 0) scale(1)`

    return html`
      <dialog
        aria-label="Image preview"
        @cancel=${this._handleCancel}
        @close=${this._handleNativeClose}
        @pointerdown=${this._interaction.handlePointerDown}
        @click=${this._interaction.handleClick}
        @dblclick=${this._interaction.handleDoubleClick}
        @keydown=${this._interaction.handleKeydown}
        @wheel=${this._interaction.handleWheel}
        @transitionend=${this._handleTransitionEnd}
      >
        <div class="wui-image-preview-backdrop" aria-hidden="true"></div>
        <div class="wui-image-preview-content">
          <div class="wui-image-preview-surface">
            <div
              class=${classMap({
                'wui-image-preview-stage': true,
                'is-zoomed': zoomed,
                'is-dragging': dragging,
                'is-settling': swipeSettling
              })}
            >
              <div
                class="wui-image-preview-track"
                style=${styleMap({ transform: trackTransform })}
                @transitionend=${this._interaction.handleTrackTransitionEnd}
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
                            data-index=${prevIndex}
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
                              'is-loaded': this._loadedSources.has(this.images[index].src)
                            })}
                            data-index=${index}
                            src=${this.images[index].src}
                            alt=${this.images[index].alt ?? ''}
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
                            data-index=${nextIndex}
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
          </div>
          <div class="wui-image-preview-controls">
            ${
              this.indicator
                ? html`<span class="wui-image-preview-counter wui-glass" aria-live="polite"
                    >${index + 1} / ${count}</span
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
                      aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'close')}
                      @click=${this.close}
                    >
                      <web-ui-icon .icon=${oouiClose}></web-ui-icon>
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
                      aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'previousImage')}
                      ?disabled=${!this.loop && index === 0}
                      @click=${this.prev}
                    >
                      <web-ui-icon size="20" .icon=${lucideChevronLeft}></web-ui-icon>
                    </web-ui-button>
                    <web-ui-button
                      class="wui-image-preview-nav wui-image-preview-nav-next"
                      variant="glass"
                      icon
                      size="44"
                      aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'nextImage')}
                      ?disabled=${!this.loop && index === count - 1}
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
                        aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'zoomOut')}
                        ?disabled=${scale <= MIN_SCALE}
                        @click=${this.zoomOut}
                      >
                        <web-ui-icon .icon=${lucideMinus}></web-ui-icon>
                      </web-ui-button>
                      <span class="wui-image-preview-scale">${Math.round(scale * 100)}%</span>
                      <web-ui-button
                        variant="glass"
                        icon
                        size="30"
                        aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'zoomIn')}
                        ?disabled=${scale >= MAX_SCALE}
                        @click=${this.zoomIn}
                      >
                        <web-ui-icon .icon=${lucidePlus}></web-ui-icon>
                      </web-ui-button>
                      <web-ui-button
                        variant="glass"
                        icon
                        size="30"
                        aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'resetZoom')}
                        ?disabled=${scale <= MIN_SCALE && !panned}
                        @click=${this.resetZoom}
                      >
                        <web-ui-icon .icon=${radixIconsReset}></web-ui-icon>
                      </web-ui-button>
                    </div>
                  `
                : nothing
            }
          </div>
        </div>
      </dialog>
    `
  }
}

/**
 * 打开一个命令式 image preview。
 *
 * 组件挂载到目标 `web-ui-theme` 的 overlay 容器（无主题作用域时回退到全局
 * fallback root），返回的 handle 是唯一的控制入口。所有展示类 option 默认关闭，
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
    noBackdropClose: options.noBackdropClose ?? false,
    ariaLabels: options.ariaLabels
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
