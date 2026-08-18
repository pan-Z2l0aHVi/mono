import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { classMap } from 'lit/directives/class-map.js'
import { styleMap } from 'lit/directives/style-map.js'

import glass from '@/assets/glass.css?inline'
import '@/components/icon'
import '@/components/button'
import '@/components/drawer'
import { radixIconsPanelLeftMinimized } from '@/icons'

import style from './style.css?inline'

/**
 * Layout 组件 - 提供页面布局框架，支持可折叠侧边栏
 *
 * @fires sidebar-collapsed-change - 桌面端侧边栏折叠状态变更请求时触发
 * @fires sidebar-open-change - 移动端侧边栏 Drawer 开关请求时触发
 * @slot banner - 顶部 Banner 区域（全宽，随页面滚动，可选）
 * @slot header - 内容区顶部 header（sticky）
 * @slot sidebar - 侧边栏内容；Consumer 决定其内部固定区域与滚动容器
 * @slot tabbar - 底部 tabbar 区域
 * @slot default - 主内容区
 */
@customElement('web-ui-layout')
export class WebUiLayout extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, attribute: 'sidebar-collapsed', reflect: true })
  sidebarCollapsed = false

  @property({ type: String, attribute: 'sidebar-width', reflect: true })
  sidebarWidth = '240px'

  @property({ type: String, attribute: 'collapsed-width', reflect: true })
  collapsedWidth = '72px'

  @property({ type: Boolean, attribute: 'sidebar-open', reflect: true })
  sidebarOpen = false

  @state() private _isMobile = false
  private _hasBanner = false

  private _bannerObserver: ResizeObserver | null = null
  private _bannerFrame: number | null = null

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

  private _checkMobile() {
    this._isMobile = window.innerWidth <= 640
  }

  private _resizeTimeout: ReturnType<typeof setTimeout> | null = null

  private _handleResize = () => {
    if (this._resizeTimeout !== null) clearTimeout(this._resizeTimeout)
    this._resizeTimeout = setTimeout(() => {
      this._checkMobile()
      this._scheduleBannerSync()
      this._resizeTimeout = null
    }, 100)
  }

  private readonly _scheduleBannerSync = () => {
    if (this._bannerFrame !== null) return
    this._bannerFrame = requestAnimationFrame(() => {
      this._bannerFrame = null
      this._syncVisibleBannerHeight()
    })
  }

  private _observeBanner() {
    this._bannerObserver?.disconnect()
    this._bannerObserver = null

    const banner = this.shadowRoot?.querySelector('.layout-banner')
    if (!this._hasBanner || !banner) {
      this.style.setProperty('--wui-layout-visible-banner-height', '0px')
      return
    }

    this._bannerObserver = new ResizeObserver(this._scheduleBannerSync)
    this._bannerObserver.observe(banner)
  }

  private _syncVisibleBannerHeight() {
    const banner = this.shadowRoot?.querySelector('.layout-banner')
    if (!this._hasBanner || !banner) {
      this.style.setProperty('--wui-layout-visible-banner-height', '0px')
      return
    }

    const rect = banner.getBoundingClientRect()
    const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0))
    this.style.setProperty('--wui-layout-visible-banner-height', `${visibleHeight}px`)
  }

  override connectedCallback() {
    super.connectedCallback()
    this._checkMobile()
    window.addEventListener('resize', this._handleResize)
    window.addEventListener('scroll', this._scheduleBannerSync, { passive: true })
    void this.updateComplete.then(() => {
      if (this.isConnected) this._syncBannerPresence()
    })
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('resize', this._handleResize)
    window.removeEventListener('scroll', this._scheduleBannerSync)
    if (this._resizeTimeout !== null) clearTimeout(this._resizeTimeout)
    this._resizeTimeout = null
    if (this._bannerFrame !== null) cancelAnimationFrame(this._bannerFrame)
    this._bannerFrame = null
    this._bannerObserver?.disconnect()
    this._bannerObserver = null
  }

  override firstUpdated() {
    this._syncBannerPresence()
  }

  private _onBannerSlotChange() {
    this._syncBannerPresence()
  }

  private _syncBannerPresence() {
    const bannerSlot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="banner"]')
    this._hasBanner =
      bannerSlot
        ?.assignedNodes()
        .some(
          node =>
            node.nodeType === Node.ELEMENT_NODE || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim())
        ) ?? false
    this._observeBanner()
    this._scheduleBannerSync()
  }

  override render() {
    const isSidebarOpen = !this.sidebarCollapsed
    const sidebarStyle = this._isMobile
      ? {}
      : { width: this.sidebarCollapsed ? this.collapsedWidth : this.sidebarWidth }

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
          </aside>
        </div>
        <div class="layout-content">
          <header><slot name="header"></slot></header>
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
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-layout': WebUiLayout
  }
}
