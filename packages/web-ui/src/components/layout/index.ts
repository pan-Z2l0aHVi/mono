import '@/components/button'
import '@/components/drawer'
import '@/components/icon'

import { html, LitElement, nothing, type PropertyValues, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/classes/glass.css?inline'
import glow from '@/classes/glow.css?inline'
import { icRoundMenuOpen, radixIconsPanelLeftMinimized } from '@/icons'
import { attachDragGesture, clamp, type DragGestureHandle } from '@/shared/gesture'
import { resolveBuiltinLabelSet } from '@/shared/locale/builtin-labels'
import { defineVisibleAreaTracker, VisibleAreaController } from '@/shared/visible-area'

import style from './style.css?inline'

/**
 * Layout 组件 - 提供页面布局框架，支持 collapsible sidebar 与无 sidebar 模式
 *
 * @fires sidebar-collapsed-change - 桌面端侧边栏 collapse 状态变更请求时触发
 * @fires sidebar-open-change - 移动端侧边栏 Drawer toggle 请求时触发
 * @fires sidebar-width-change - 桌面端侧边栏拖拽调宽结束时触发，携带最终宽度（受控请求）
 * @slot banner - 顶部 Banner 区域（全宽，随页面滚动，可选）
 * @slot header - 内容区顶部 header（sticky）
 * @slot sidebar - 侧边栏内容；Consumer 决定其内部固定区域与滚动容器；`no-sidebar` 置位时不渲染
 * @slot tabbar - 底部 tabbar 区域
 * @slot default - 主内容区
 */
/** `web-ui-layout` 内置无障碍名的成组覆盖；每个 key 对应一处图标控件的 accessible name。 */
export interface LayoutAriaLabels {
  collapseSidebar?: string
  expandSidebar?: string
  resizeSidebar?: string
  openNavigationMenu?: string
  mainNavigation?: string
}

@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(glow), unsafeCSS(style)]

  /**
   * 关闭整块 sidebar：桌面端不渲染 aside 与 collapse Toggle，移动端不渲染 header Toggle 与 Drawer。
   *
   * 它是布局模式而不是 collapse 的别名：`sidebar-collapsed` 只收窄桌面 aside，本属性把侧边栏
   * 结构本身从树里去掉。`sidebar` slot 随之不渲染（消费方节点仍留在 light DOM），
   * 侧边栏相关事件与属性在该模式下不产生可见效果。
   */
  @property({ type: Boolean, attribute: 'no-sidebar', reflect: true })
  noSidebar = false

  /**
   * 启用桌面端 Sidebar 的 collapse 入口。
   *
   * 只有声明了本属性，layout 才渲染收起 / 展开 Toggle，也才会因为点击而派发
   * `sidebar-collapsed-change`。桌面宽度仍由受控属性 `sidebar-collapsed` 决定，
   * 未声明本属性不会阻止它收窄；移动端 Drawer 的 header Toggle 不受影响。
   */
  @property({ type: Boolean, attribute: 'sidebar-collapsible', reflect: true })
  sidebarCollapsible = false

  /**
   * 桌面端 Sidebar 的持久布局偏好。
   *
   * `true` 只会将桌面 Sidebar 收窄到 `collapsedWidth`，不会影响移动端 Drawer。
   * 它不与 `sidebarOpen` 合并：前者是跨视口保留的密度选择，后者是移动端瞬时的 modal 可见性。
   *
   * 两处渲染的是同一份 `sidebar` slot 内容，所以本属性只负责桌面 aside 的几何：Consumer
   * 若让自己的 slot 内容跟着它变形态（隐藏 label、改排布），必须按 `mobile` 收窄那个条件
   * （例如 `collapsed && !layout.mobile`，或 CSS 的 `web-ui-layout[mobile]`），
   * 否则 collapsed state 会一路渲染进移动端 Drawer（issue #195）。
   */
  @property({ type: Boolean, attribute: 'sidebar-collapsed', reflect: true })
  sidebarCollapsed = false

  @property({ type: String, attribute: 'sidebar-width', reflect: true })
  sidebarWidth = '240px'

  @property({ type: String, attribute: 'collapsed-width', reflect: true })
  collapsedWidth = '60px'

  /** 启用桌面端 Sidebar 拖拽调宽（collapsed state 隐藏 handle）。 */
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
   * 移动端 web-ui-drawer 的瞬时可见性。
   *
   * Drawer Toggle、Escape 和 backdrop 关闭都通过 `sidebar-open-change` 请求更新它；它不会改变桌面端的 collapse preference。
   * 因而不与 `sidebarCollapsed` 合并，避免响应式切换时将一次移动端交互误写为桌面端布局选择。
   */
  @property({ type: Boolean, attribute: 'sidebar-open', reflect: true })
  sidebarOpen = false

  @property({ type: Boolean, attribute: 'header-glow', reflect: true })
  headerGlow = false

  /** 移动端 header 占满宽度，消费方为悬浮的侧栏开关预留首行空间。 */
  @property({ type: Boolean, attribute: 'mobile-header-full-width', reflect: true })
  mobileHeaderFullWidth = false

  /** 内置无障碍名的成组覆盖；未提供的 key 回退内置英文文案（见 ADR-0016）。 */
  @property({ attribute: false }) ariaLabels?: LayoutAriaLabels

  /** 由调用方控制是否使用移动端布局。 */
  @property({ type: Boolean, reflect: true })
  mobile = false

  private readonly _visibleBanner = defineVisibleAreaTracker({
    onVisibleAreaChange: area => {
      this.style.setProperty('--wui-layout-visible-banner-height', `${area.height}px`)
    }
  }).make()

  private readonly _visibleBannerController = new VisibleAreaController(this, this._visibleBanner)

  private _toggleSidebar() {
    if (this.mobile) {
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

  private _resizeGesture: DragGestureHandle | null = null
  private _resizeStartWidth = 0
  // 拖拽中的临时宽度；由 render 的 styleMap 统一写入，避免与 Lit 样式管理竞争。
  @state() private _resizeWidth: string | null = null

  private _parsePx(value: string, fallback: number): number {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  private _resolveSidebarMinWidth(): number {
    return this.sidebarMinWidth
      ? this._parsePx(this.sidebarMinWidth, this._parsePx(this.collapsedWidth, 68))
      : this._parsePx(this.collapsedWidth, 68)
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
    return this._resizeGesture?.isDragging() ?? false
  }

  private _handleResizePointerDown(e: PointerEvent) {
    if (!this.sidebarResizable || this.sidebarCollapsed || this.mobile || this._isResizing()) return
    // jsdom 等环境的 PointerEvent 可能缺失 isPrimary，仅在明确为 false（多点触控副指针）时拒绝。
    if (e.isPrimary === false) return

    const aside = this.renderRoot.querySelector('aside')
    if (!aside) return

    // 拖拽起点以 computed width 为准，并丢弃键盘未提交的调整（Enter 才提交、
    // Escape 撤回；抓取隐式放弃），保证零位移松手不会派发陈旧宽度。
    this._resizeStartWidth = this._parsePx(window.getComputedStyle(aside).width, this._parsePx(this.sidebarWidth, 240))
    this._resizeWidth = null
    aside.classList.add('is-resizing')

    this._resizeGesture = attachDragGesture(e, {
      axis: 'x',
      onMove: info => {
        // 向右拖增宽、向左拖收窄（handle 在右缘）；钳制在 [min, max] 与视口内。
        const next = this._resizeStartWidth + info.deltaX
        const clamped = clamp(next, this._resolveSidebarMinWidth(), this._resolveSidebarMaxWidth())
        this._resizeWidth = `${Math.round(clamped)}px`
      },
      onEnd: () => {
        // 零位移松手（点击而非拖拽）不视为调宽动作：按 cancel 语义静默收尾。
        if (this._resizeWidth === null) {
          this._resetActiveResize()
          return
        }
        const width = this._resizeWidth
        this._resetActiveResize()
        // 受控契约：松手派发请求并交还 prop 管辖，由 Consumer 回写 sidebar-width。
        this.dispatchEvent(
          new CustomEvent('sidebar-width-change', {
            detail: { width },
            bubbles: true,
            composed: true
          })
        )
      },
      onCancel: () => {
        this._resetActiveResize()
      }
    })
  }

  // 终结进行中的拖拽：清手势状态、移除跟手 class，宽度过渡回 prop 管辖，不派发事件。
  // pointer cancel、跨越移动端断点和切入 no-sidebar 时共用此收尾。
  private _resetActiveResize() {
    this._resizeGesture?.destroy()
    this._resizeGesture = null
    this.renderRoot.querySelector('aside')?.classList.remove('is-resizing')
    this._resizeWidth = null
  }

  // 键盘调宽（WAI-ARIA splitter 模式）：方向键步进 16px（Shift 加速 64px）调整
  // 临时宽度，Enter 以受控请求派发 `sidebar-width-change`（与指针松手同语义），
  // Escape 撤回临时宽度交还 prop 管辖，Home/End 直接到 min/max。
  private _handleResizeKeydown(e: KeyboardEvent) {
    if (!this.sidebarResizable || this.sidebarCollapsed || this.mobile || this._isResizing()) return

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

  override connectedCallback() {
    super.connectedCallback()
    void this.updateComplete.then(() => {
      if (this.isConnected) this._syncBannerPresence()
    })
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._resetActiveResize()
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

  /*
   * 切到无 sidebar 模式会卸载 aside；先终结进行中的拖拽与未提交的临时宽度，
   * 否则手势悬挂，切回桌面后新拖拽会在 `_isResizing()` 入口被拦下。
   */
  protected override willUpdate(changed: PropertyValues) {
    super.willUpdate(changed)
    if ((changed.has('noSidebar') && this.noSidebar) || (changed.has('mobile') && this.mobile))
      this._resetActiveResize()
  }

  override render() {
    const showSidebar = !this.noSidebar
    const isSidebarOpen = !this.sidebarCollapsed
    // 拖拽中的临时宽度优先于 prop 宽度；移动端宽度由 Drawer 内部变量管理。
    const sidebarStyle = this.mobile
      ? {}
      : { width: this._resizeWidth ?? (this.sidebarCollapsed ? this.collapsedWidth : this.sidebarWidth) }

    const toggleLabel = resolveBuiltinLabelSet(this.ariaLabels, isSidebarOpen ? 'collapseSidebar' : 'expandSidebar')

    const desktopToggle = this.sidebarCollapsible
      ? html`
          <web-ui-button
            class="sidebar-toggle"
            icon
            variant="ghost"
            @click="${this._toggleSidebar}"
            aria-label=${toggleLabel}
          >
            <web-ui-icon
              .icon=${icRoundMenuOpen}
              style=${styleMap({ transform: isSidebarOpen ? 'none' : 'scaleX(-1)' })}
            ></web-ui-icon>
          </web-ui-button>
        `
      : nothing

    const sidebarViewport = html`
      <div class="sidebar-viewport">
        <slot name="sidebar"></slot>
      </div>
    `

    const header = html`
      <header class="${classMap({ 'wui-glow': this.headerGlow })}">
        ${
          this.mobile && showSidebar
            ? html`
                <web-ui-button
                  class="mobile-toggle"
                  icon
                  variant="glass"
                  @click="${this._toggleSidebar}"
                  aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'openNavigationMenu')}
                >
                  <web-ui-icon .icon=${radixIconsPanelLeftMinimized}></web-ui-icon>
                </web-ui-button>
              `
            : nothing
        }
        <slot name="header"></slot>
      </header>
    `

    const contentLayout = html`
      <div class="layout-content">
        ${header}
        <main><slot></slot></main>
        <footer><slot name="tabbar"></slot></footer>
      </div>
    `

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
              ${this.sidebarCollapsible ? html`<div class="sidebar-toggle-area">${desktopToggle}</div>` : nothing}
            </div>
            ${
              this.sidebarResizable && !this.sidebarCollapsed
                ? html`
                    <div
                      class="sidebar-resize-handle"
                      role="separator"
                      tabindex="0"
                      aria-orientation="vertical"
                      aria-label=${resolveBuiltinLabelSet(this.ariaLabels, 'resizeSidebar')}
                      @pointerdown=${this._handleResizePointerDown}
                      @keydown=${this._handleResizeKeydown}
                    ></div>
                  `
                : nothing
            }
          </aside>
        </div>
        ${contentLayout}
      </div>
    `

    const mobileDrawer = html`
      <web-ui-drawer
        placement="left"
        ?open="${this.sidebarOpen}"
        controlled
        draggable
        page-shift
        aria-dialog-label=${resolveBuiltinLabelSet(this.ariaLabels, 'mainNavigation')}
        @open-change="${this._onDrawerChange}"
        style="${styleMap({
          '--wui-drawer-width': this.sidebarWidth,
          '--wui-drawer-radius': 'var(--wui-layout-sidebar-radius, 24px)',
          '--wui-drawer-content-padding': 'var(--wui-layout-sidebar-content-padding, var(--wui-space-5, 20px))',
          '--wui-drawer-inset-top': 'var(--wui-layout-sidebar-padding-top, var(--wui-space-2, 8px))',
          '--wui-drawer-inset-left': 'var(--wui-layout-sidebar-padding-left, var(--wui-space-2, 8px))',
          '--wui-drawer-inset-bottom': 'var(--wui-layout-sidebar-padding-bottom, var(--wui-space-2, 8px))'
        })}"
      >
        ${sidebarViewport}
      </web-ui-drawer>
    `

    /*
     * 无 sidebar 模式只留内容列：桌面 aside 与移动端 Toggle / Drawer 都不进树，
     * `sidebar` slot 因而没有渲染出口（消费方节点仍留在 light DOM）。
     */
    const layoutBody = showSidebar
      ? this.mobile
        ? html`${contentLayout}${mobileDrawer}`
        : desktopLayout
      : contentLayout

    return html`
      <div class="layout-page">
        <div class="layout-banner">
          <slot name="banner" @slotchange="${this._onBannerSlotChange}"></slot>
        </div>
        ${layoutBody}
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
