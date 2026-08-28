import { html, LitElement, nothing, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import '@/components/icon'
import '@/components/button'
import '@/components/drawer'
import { radixIconsPanelLeftMinimized } from '@/icons'
import { defineVisibleAreaTracker, VisibleAreaController } from '@/shared/visible-area'

import style from './style.css?inline'

/**
 * Layout 组件 - 提供页面布局框架，支持可折叠侧边栏
 *
 * @fires sidebar-collapsed-change - 桌面端侧边栏折叠状态变更请求时触发
 * @fires sidebar-open-change - 移动端侧边栏 Drawer 开关请求时触发
 * @fires sidebar-width-change - 桌面端侧边栏拖拽调宽结束时触发，携带最终宽度（受控请求）
 * @slot banner - 顶部 Banner 区域（全宽，随页面滚动，可选）
 * @slot header - 内容区顶部 header（sticky）
 * @slot sidebar - 侧边栏内容；Consumer 决定其内部固定区域与滚动容器
 * @slot tabbar - 底部 tabbar 区域
 * @slot default - 主内容区
 */
@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  /**
   * 桌面端 Sidebar 的持久布局偏好。
   *
   * `true` 只会将桌面 Sidebar 收窄到 `collapsedWidth`，不会影响移动端 Drawer。
   * 它不与 `sidebarOpen` 合并：前者是跨视口保留的密度选择，后者是移动端瞬时的 modal 可见性。
   */
  @property({ type: Boolean, attribute: 'sidebar-collapsed', reflect: true })
  sidebarCollapsed = false

  @property({ type: String, attribute: 'sidebar-width', reflect: true })
  sidebarWidth = '240px'

  @property({ type: String, attribute: 'collapsed-width', reflect: true })
  collapsedWidth = '72px'

  /** 启用桌面端 Sidebar 拖拽调宽（折叠态隐藏 handle）。 */
  @property({ type: Boolean, attribute: 'sidebar-resizable', reflect: true })
  sidebarResizable = false

  /**
   * 拖拽调宽的下限（px，其他单位不解析）；未设置时回退为 `collapsedWidth`，
   * 防止拖到不可用宽度。上限 `sidebar-max-width` 受内置 50vw 硬上限钳制。
   */
  @property({ type: String, attribute: 'sidebar-min-width', reflect: true })
  sidebarMinWidth = ''

  /** 拖拽调宽的上限（px，其他单位不解析）；始终受内置 50vw 硬上限钳制。 */
  @property({ type: String, attribute: 'sidebar-max-width', reflect: true })
  sidebarMaxWidth = ''

  /**
   * 移动端 headless Drawer 的瞬时可见性。
   *
   * Drawer Toggle、Escape 和遮罩关闭都通过 `sidebar-open-change` 请求更新它；它不会改变桌面端的折叠偏好。
   * 因而不与 `sidebarCollapsed` 合并，避免响应式切换时将一次移动端交互误写为桌面端布局选择。
   */
  @property({ type: Boolean, attribute: 'sidebar-open', reflect: true })
  sidebarOpen = false

  /**
   * 启用 header 晕染效果
   */
  @property({ type: Boolean, attribute: 'header-glow', reflect: true })
  headerGlow = false

  @state() private _isMobile = false

  private readonly _visibleBanner = defineVisibleAreaTracker({
    onVisibleAreaChange: area => {
      this.style.setProperty('--wui-layout-visible-banner-height', `${area.height}px`)
    }
  }).make()

  private readonly _visibleBannerController = new VisibleAreaController(this, this._visibleBanner)

  private _toggleSidebar() {
    if (this._isMobile) {
      this._emitSidebarOpenChange(!this.sidebarOpen)
      return
    }

    this._emitSidebarCollapsedChange(!this.sidebarCollapsed)
  }

  private _emitSidebarCollapsedChange(collapsed: boolean) {
    this.dispatchEvent(
      new CustomEvent('sidebar-collapsed-change', {
        detail: { collapsed },
        bubbles: true,
        composed: true
      })
    )
  }

  private _emitSidebarOpenChange(open: boolean) {
    this.dispatchEvent(
      new CustomEvent('sidebar-open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _onDrawerChange(e: CustomEvent<{ open: boolean }>) {
    e.stopPropagation()
    this._emitSidebarOpenChange(e.detail.open)
  }

  // ===== 桌面端 Sidebar 拖拽调宽 =====

  private _resizePointerId: number | null = null
  private _resizeStartClientX = 0
  private _resizeStartWidth = 0
  // 拖拽中的临时宽度；由 render 的 styleMap 统一写入，避免与 Lit 样式管理竞争。
  @state() private _resizeWidth: string | null = null

  /*
   * 手势期间的 move/up/cancel 同时挂 handle 与 window 捕获阶段两条路径：
   * Chromium 快速拖拽可能提前释放 setPointerCapture（与 Drawer 的修复同构，
   * 见 drawer/index.ts），窗口层保证松手一定被消费、状态机不悬挂；
   * _handledMoveEvent 以事件对象去重，防止同一输入被两条路径重复采样。
   */
  private readonly _onWindowResizeMove = (e: PointerEvent) => this._handleResizePointerMove(e)
  private readonly _onWindowResizeUp = (e: PointerEvent) => this._handleResizePointerUp(e)
  private readonly _onWindowResizeCancel = (e: PointerEvent) => this._handleResizePointerCancel(e)
  private _handledMoveEvent: PointerEvent | null = null

  private _attachWindowResizeListeners() {
    window.addEventListener('pointermove', this._onWindowResizeMove, true)
    window.addEventListener('pointerup', this._onWindowResizeUp, true)
    window.addEventListener('pointercancel', this._onWindowResizeCancel, true)
  }

  private _detachWindowResizeListeners() {
    window.removeEventListener('pointermove', this._onWindowResizeMove, true)
    window.removeEventListener('pointerup', this._onWindowResizeUp, true)
    window.removeEventListener('pointercancel', this._onWindowResizeCancel, true)
  }

  private _parsePx(value: string, fallback: number): number {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private _resolveSidebarMinWidth(): number {
    // 未设置时回退为折叠宽度，防止拖到不可用宽度。
    return this.sidebarMinWidth
      ? this._parsePx(this.sidebarMinWidth, this._parsePx(this.collapsedWidth, 72))
      : this._parsePx(this.collapsedWidth, 72)
  }

  private _resolveSidebarMaxWidth(): number {
    // 组件内置硬上限：Sidebar 最多占视口一半（无需调用方设置）。
    // 调用方 sidebar-max-width 在该上限内生效，防止拖拽占据整个视口。
    const halfViewport = Math.floor(window.innerWidth / 2)
    const configured = this.sidebarMaxWidth ? this._parsePx(this.sidebarMaxWidth, halfViewport) : halfViewport
    const upper = Math.min(configured, halfViewport)
    return Math.max(upper, this._resolveSidebarMinWidth())
  }

  private _isResizing(): boolean {
    return this._resizePointerId !== null
  }

  private _handleResizePointerDown(e: PointerEvent) {
    if (!this.sidebarResizable || this.sidebarCollapsed || this._isMobile || this._isResizing()) return
    // jsdom 等环境的 PointerEvent 可能缺失 isPrimary，仅在明确为 false（多点触控副指针）时拒绝。
    if (e.isPrimary === false) return

    const aside = this.renderRoot.querySelector('aside')
    if (!aside) return

    e.preventDefault()
    this._resizePointerId = e.pointerId
    this._resizeStartClientX = e.clientX
    // 拖拽起点以 computed width 为准，并丢弃键盘未提交的调整（Enter 才提交、
    // Escape 撤回；抓取隐式放弃），保证零位移松手不会派发陈旧宽度。
    this._resizeStartWidth = this._parsePx(window.getComputedStyle(aside).width, this._parsePx(this.sidebarWidth, 240))
    this._resizeWidth = null
    this._handledMoveEvent = null

    // 先挂 window 兜底再尝试 capture：即使 capture 调用失败，手势仍可收尾。
    this._attachWindowResizeListeners()
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    } catch {
      // 忽略合成指针或不可捕获上下文（如测试环境）
    }
    aside.classList.add('is-resizing')
  }

  private _handleResizePointerMove(e: PointerEvent) {
    if (this._resizePointerId !== e.pointerId) return
    // window 捕获层先于 handle 收到同一事件；已处理过则跳过，避免重复采样。
    if (this._handledMoveEvent === e) return
    this._handledMoveEvent = e

    // 向右拖增宽、向左拖收窄（handle 在右缘）；钳制在 [min, max] 与视口内。
    const delta = e.clientX - this._resizeStartClientX
    const next = this._resizeStartWidth + delta
    const clamped = Math.min(this._resolveSidebarMaxWidth(), Math.max(this._resolveSidebarMinWidth(), next))
    this._resizeWidth = `${Math.round(clamped)}px`
  }

  private _handleResizePointerUp(e: PointerEvent) {
    if (this._resizePointerId !== e.pointerId) return
    // 零位移松手（点击而非拖拽）不视为调宽动作：按 cancel 语义静默收尾。
    if (this._resizeWidth === null) {
      this._resetActiveResize()
      return
    }
    this._resizePointerId = null
    this._detachWindowResizeListeners()

    this.renderRoot.querySelector('aside')?.classList.remove('is-resizing')

    // 受控契约：拖拽中组件内部实时更新宽度；松手派发请求并交还 prop 管辖，
    // Consumer 回写 sidebar-width 后新宽度正式生效（同步回写时 Lit 批处理无跳变）。
    const width = this._resizeWidth
    this._resizeWidth = null
    this.dispatchEvent(
      new CustomEvent('sidebar-width-change', {
        detail: { width },
        bubbles: true,
        composed: true
      })
    )
  }

  private _handleResizePointerCancel(e: PointerEvent) {
    if (this._resizePointerId !== e.pointerId) return
    this._resetActiveResize()
  }

  // 终结进行中的拖拽：清手势状态、移除跟手 class，宽度过渡回 prop 管辖，不派发事件。
  // pointer cancel 与视口跨越移动端断点（handle 随桌面 layout 卸载）共用此收尾。
  private _resetActiveResize() {
    this._resizePointerId = null
    this._detachWindowResizeListeners()
    this.renderRoot.querySelector('aside')?.classList.remove('is-resizing')
    this._resizeWidth = null
  }

  // 键盘调宽（WAI-ARIA splitter 模式）：方向键步进 16px（Shift 加速 64px）调整
  // 临时宽度，Enter 以受控请求派发 `sidebar-width-change`（与指针松手同语义），
  // Escape 撤回临时宽度交还 prop 管辖，Home/End 直接到 min/max。
  private _handleResizeKeydown(e: KeyboardEvent) {
    if (!this.sidebarResizable || this.sidebarCollapsed || this._isMobile || this._isResizing()) return

    const min = this._resolveSidebarMinWidth()
    const max = this._resolveSidebarMaxWidth()
    const aside = this.renderRoot.querySelector('aside')
    const current = this._resizeWidth
      ? this._parsePx(this._resizeWidth, min)
      : this._parsePx(aside ? window.getComputedStyle(aside).width : this.sidebarWidth, min)
    const step = e.shiftKey ? 64 : 16
    let next: number | null = null

    switch (e.key) {
      case 'ArrowLeft':
        next = Math.max(min, current - step)
        break
      case 'ArrowRight':
        next = Math.min(max, current + step)
        break
      case 'Home':
        next = min
        break
      case 'End':
        next = max
        break
      case 'Enter':
        // 无未提交调整时不派发（焦点停留时的回车噪声）
        if (this._resizeWidth !== null) {
          const width = this._resizeWidth
          this._resizeWidth = null
          this.dispatchEvent(
            new CustomEvent('sidebar-width-change', { detail: { width }, bubbles: true, composed: true })
          )
        }
        e.preventDefault()
        return
      case 'Escape':
        this._resizeWidth = null
        e.preventDefault()
        return
      default:
        return
    }
    e.preventDefault()
    this._resizeWidth = `${Math.round(next)}px`
  }

  private _checkMobile() {
    const nextMobile = window.innerWidth <= 640
    // 视口跨越移动端断点会卸载桌面 layout（handle 随之消失）；必须先终结进行中的
    // 拖拽，否则 _resizePointerId 悬挂，切回桌面后所有新的拖拽在入口被拦截。
    if (nextMobile !== this._isMobile && this._isResizing()) this._resetActiveResize()
    this._isMobile = nextMobile
  }

  private _resizeTimeout: ReturnType<typeof setTimeout> | null = null

  private _handleResize = () => {
    if (this._resizeTimeout !== null) clearTimeout(this._resizeTimeout)
    this._resizeTimeout = setTimeout(() => {
      this._checkMobile()
      this._resizeTimeout = null
    }, 100)
  }

  override connectedCallback() {
    super.connectedCallback()
    this._checkMobile()
    window.addEventListener('resize', this._handleResize)
    void this.updateComplete.then(() => {
      if (this.isConnected) this._syncBannerPresence()
    })
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._detachWindowResizeListeners()
    window.removeEventListener('resize', this._handleResize)
    if (this._resizeTimeout !== null) clearTimeout(this._resizeTimeout)
    this._resizeTimeout = null
  }

  override firstUpdated() {
    this._syncBannerPresence()
  }

  private _onBannerSlotChange() {
    this._syncBannerPresence()
  }

  private _syncBannerPresence() {
    const bannerSlot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="banner"]')
    const hasBanner =
      bannerSlot
        ?.assignedNodes()
        .some(
          node =>
            node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim())
        ) ?? false
    const banner = this.shadowRoot?.querySelector<HTMLElement>('.layout-banner') ?? null
    this._visibleBanner.setTarget(hasBanner ? banner : null)
  }

  override render() {
    const isSidebarOpen = !this.sidebarCollapsed
    // 拖拽中的临时宽度优先于 prop 宽度；移动端宽度由 Drawer 内部变量管理。
    const sidebarStyle = this._isMobile
      ? {}
      : { width: this._resizeWidth ?? (this.sidebarCollapsed ? this.collapsedWidth : this.sidebarWidth) }

    const toggleLabel = isSidebarOpen ? '折叠侧边栏' : '展开侧边栏'

    const desktopToggle = html`
      <web-ui-button
        class="sidebar-toggle"
        icon
        variant="secondary"
        @click="${this._toggleSidebar}"
        aria-label="${toggleLabel}"
      >
        <web-ui-icon .icon=${radixIconsPanelLeftMinimized}></web-ui-icon>
      </web-ui-button>
    `

    const sidebarViewport = html`
      <div class="sidebar-viewport">
        <slot name="sidebar"></slot>
      </div>
    `

    // 桌面端布局
    const desktopLayout = html`
      <div class="layout-body">
        <div class="sidebar-wrapper">
          <aside
            class="${classMap({
              collapsed: !isSidebarOpen
            })}"
            style="${styleMap(sidebarStyle)}"
          >
            <div class="aside-panel wui-glass">
              ${sidebarViewport}
              <div class="sidebar-toggle-area">${desktopToggle}</div>
            </div>
            ${
              this.sidebarResizable && !this.sidebarCollapsed
                ? html`
                    <div
                      class="sidebar-resize-handle"
                      role="separator"
                      tabindex="0"
                      aria-orientation="vertical"
                      aria-label="调整侧边栏宽度"
                      @pointerdown=${this._handleResizePointerDown}
                      @pointermove=${this._handleResizePointerMove}
                      @pointerup=${this._handleResizePointerUp}
                      @pointercancel=${this._handleResizePointerCancel}
                      @keydown=${this._handleResizeKeydown}
                    ></div>
                  `
                : nothing
            }
          </aside>
        </div>
        <div class="layout-content">
          <header>
            <slot name="header"></slot>
          </header>
          <main><slot></slot></main>
          <footer><slot name="tabbar"></slot></footer>
        </div>
      </div>
    `

    // 移动端布局
    const mobileLayout = html`
      <div class="layout-content">
        <header>
          <web-ui-button
            class="mobile-toggle"
            icon
            variant="secondary"
            @click="${this._toggleSidebar}"
            aria-label="打开导航菜单"
          >
            <web-ui-icon .icon=${radixIconsPanelLeftMinimized}></web-ui-icon>
          </web-ui-button>
          <slot name="header"></slot>
        </header>
        <main><slot></slot></main>
        <footer><slot name="tabbar"></slot></footer>
      </div>

      <web-ui-drawer
        placement="left"
        ?open="${this.sidebarOpen}"
        request-only
        draggable
        dialog-label="主导航"
        @open-change="${this._onDrawerChange}"
        style="${styleMap({ '--wui-layout-mobile-sidebar-width': this.sidebarWidth })}"
        headless
      >
        <div class="aside-panel wui-glass mobile-sidebar">${sidebarViewport}</div>
      </web-ui-drawer>
    `

    return html`
      <div class="layout-page">
        <div class="layout-banner">
          <slot name="banner" @slotchange="${this._onBannerSlotChange}"></slot>
        </div>
        ${this._isMobile ? mobileLayout : desktopLayout}
      </div>
    `
  }

  declare readonly $events: {
    'sidebar-collapsed-change': CustomEvent<{ collapsed: boolean }>
    'sidebar-open-change': CustomEvent<{ open: boolean }>
    'sidebar-width-change': CustomEvent<{ width: string }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-layout': WebUiLayout
  }
}
