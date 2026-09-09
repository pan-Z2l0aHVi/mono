import { computePosition, shift } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/dropdown-divider'
import '@/components/dropdown-header'
import '@/components/dropdown-item'
import { UserChangeController } from '@/shared/events/user-change'
import {
  createClosingSubmenuStack,
  createMenuHoverBinder,
  createMenuOutsideClickGuard,
  getEnabledMenuLevelItems,
  getFocusedMenuItemFromPanels,
  handleMenuKeyboard,
  type MenuHoverDelegate,
  type MenuKeyboardDelegate
} from '@/shared/menu-behavior'
import { createMenuPortalOverlay, type MenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import {
  captureFrameworkAnchors,
  focusMenuItem,
  getMenuChildren,
  getMenuItemFromEvent,
  hideNestedMenuChildren,
  moveMenuChildren,
  orderManagedMenuItems,
  reconcileManagedMenuItems,
  restoreFrameworkAnchors,
  returnManagedMenuItemsToSlot
} from '@/shared/menu-portal/menu-tree'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

const MARKER_TEXT = 'wui-context-menu-item'

@customElement('web-ui-context-menu')
export class WebUiContextMenu extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false

  @state() private _isOpen = false
  @state() private _x = 0
  @state() private _y = 0

  private _activeSubmenus: MenuPortalOverlay[] = []
  private _activeSubmenuItems: HTMLElement[] = []
  // 子菜单 dialog 定位的唯一写者代数（按 panel 键控）：同帧关闭→重开复用同一 panel
  // 时只允许最新一次定位写入；不同层级子菜单各有 panel，互不作废。
  private readonly _submenuPositionEpochs = new WeakMap<HTMLElement, number>()
  private _menu?: MenuPortalOverlay
  // 行为层（hover / outside-click / 键盘 / submenu 收尾）由 shared/menu-behavior 驱动
  private readonly _outsideClickGuard = createMenuOutsideClickGuard(
    this,
    node => this._menu?.panel.contains(node) === true || this._activeSubmenus.some(menu => menu.panel.contains(node))
  )
  private readonly _closingSubmenus = createClosingSubmenuStack<MenuPortalOverlay>({
    getPanel: container => container.panel,
    restoreItems: (container, parentItem) => this._restoreSubmenuItems(container, parentItem),
    dispose: container => container.panel.remove()
  })
  private readonly _hoverDelegate: MenuHoverDelegate = {
    getOpenDepth: () => this._activeSubmenus.length,
    getLevelItems: level => this._getLevelItems(level),
    getActiveItem: level => this._activeSubmenuItems[level],
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenu: item => this._openSubmenu(item),
    closeFrom: level => {
      this._closeSubmenusFrom(level)
      this._hoverBinder.bind()
    }
  }
  private readonly _hoverBinder = createMenuHoverBinder(this._hoverDelegate, 'web-ui-dropdown-item')
  private readonly _keyboardDelegate: MenuKeyboardDelegate = {
    getFocusedItem: event =>
      getFocusedMenuItemFromPanels(
        event,
        [this._menu?.content, ...this._activeSubmenus.map(submenu => submenu.content)],
        'web-ui-dropdown-item'
      ),
    getLevelOf: item => {
      const level = this._getItemLevel(item)
      return level === -1 ? undefined : level
    },
    getEnabledItems: level => getEnabledMenuLevelItems(this._getLevelContainer(level)?.content),
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenuInstant: item => this._openSubmenu(item, true),
    closeToParent: level => {
      const parent = this._activeSubmenuItems[level - 1]
      this._closeSubmenusFrom(level - 1)
      this._hoverBinder.bind()
      return parent
    },
    closeDeepestOrAll: () => this._closeLastSubmenuOrMenu()
  }
  private readonly _menuItemAnchors = new Map<HTMLElement, Comment>()
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _userOpenChange = new UserChangeController()
  private _restoreFocusTarget?: HTMLElement
  private _shouldOpenInstantly = true
  private _refreshScheduled = false
  // 菜单打开期间宿主可能不经重定位直接改写子内容（网络推送、定时器等），
  // 新节点缺隐藏 slot 会可见叠加到菜单上；观察 portal 内容并在下一帧重新同步。
  private readonly _contentObserver = new MutationObserver(() => {
    if (this._isOpen) this._scheduleRefresh()
  })

  get isOpen(): boolean {
    return this._isOpen
  }

  override connectedCallback() {
    super.connectedCallback()
    this._hideMenuItems()
    this.addEventListener('contextmenu', this._onContextMenu)
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('click', this._onMenuClick)
    document.addEventListener('click', this._onClickOutside)
    document.addEventListener('contextmenu', this._onContextMenuOutside)
    document.addEventListener('wheel', this._onWheel, { capture: true, passive: false })
    document.addEventListener('touchmove', this._onTouchMove, { capture: true, passive: false })
    document.addEventListener('keydown', this._onDocumentKeydown)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('contextmenu', this._onContextMenu)
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('click', this._onMenuClick)
    document.removeEventListener('click', this._onClickOutside)
    document.removeEventListener('contextmenu', this._onContextMenuOutside)
    document.removeEventListener('wheel', this._onWheel, true)
    document.removeEventListener('touchmove', this._onTouchMove, true)
    document.removeEventListener('keydown', this._onDocumentKeydown)
    this._contentObserver.disconnect()
    this._outsideClickGuard.dispose()
    this._hoverBinder.dispose()
    this._scrollLock.release()
    this._returnItemsToSlot()
    this._menu?.panel.remove()
    this._menu = undefined
    this._closeSubmenusFrom(0, true)
    this._closingSubmenus.restoreAll()
    // 脱离文档即视为关闭：否则重连后 _isOpen 仍为 true 而 _menu 已清空，
    // 下次 openAt 会走已打开分支静默失败，菜单无法再打开。
    this._isOpen = false
    this._restoreFocusTarget = undefined
  }

  protected override updated(changed: Map<string, unknown>) {
    // Lit 的已排队更新可在卸载后执行，不能让已失效实例重新获取全局滚动锁。
    if (!this.isConnected) {
      this._syncScrollLock(false)
      return
    }

    if (changed.has('_isOpen')) {
      if (this._isOpen) {
        this._syncScrollLock()
        if (!this._menu) {
          this._menu = createMenuPortalOverlay('context-menu', this)
          this._menu.panel.setAttribute('role', 'menu')
          this._menu.panel.setAttribute('aria-label', '上下文菜单')
          this._menu.panel.addEventListener('click', this._onMenuClick)
        }
        // 父项始终留在 menu.content 内，观察它即可覆盖各级子菜单在打开期间的内容重建。
        this._contentObserver.observe(this._menu.content, { childList: true, subtree: true })
        requestAnimationFrame(() => {
          if (!this._isOpen || !this._menu) return
          this._refreshMenu()
          showOverlayPresence(this._menu.panel, { isInstant: this._shouldOpenInstantly })
          this._shouldOpenInstantly = true
          this._focusFirstItem()
        })
      } else {
        this._syncScrollLock(false)
        this._contentObserver.disconnect()
        this._refreshScheduled = false
        void this._closeMenuAfterPresence()
      }
      if (this._userOpenChange.consume()) this._dispatchChange(this._isOpen)
    }
    if (changed.has('noScrollLock')) this._syncScrollLock()
  }

  /**
   * 在指定视口坐标打开菜单。
   * @param x 水平坐标（px）。
   * @param y 垂直坐标（px）。
   * @returns 无返回值；命令式打开不派发 `open-change` 事件。
   */
  openAt(x: number, y: number) {
    this._openAt(x, y, true)
  }

  private _openAt(x: number, y: number, isInstant: boolean): boolean {
    if (this.disabled) return false
    this._x = x
    this._y = y
    this._shouldOpenInstantly = isInstant
    this._outsideClickGuard.arm()
    if (this._isOpen) {
      this._closeSubmenusFrom(0, true)
      this._closingSubmenus.restoreAll()
      this._scheduleRefresh()
      return false
    }
    this._restoreFocusTarget ??= document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    this._isOpen = true
    return true
  }

  /**
   * 关闭菜单。
   * @returns 无返回值；命令式关闭不派发 `open-change` 事件。
   */
  close() {
    if (!this._isOpen) return
    this._isOpen = false
  }

  private readonly _closeFromUser = () => {
    if (!this._isOpen) return
    this._userOpenChange.mark()
    this.close()
  }

  // 同一帧内多次内容变化只刷新一次，避免观察者与刷新自身 append 形成循环。
  private _scheduleRefresh() {
    if (this._refreshScheduled || !this._isOpen) return
    this._refreshScheduled = true
    requestAnimationFrame(() => {
      this._refreshScheduled = false
      if (!this._isOpen || !this._menu) return
      this._refreshMenu()
    })
  }

  // 重新同步 portal 内容并重定位；fresh-open、重定位与观察者触发的刷新共用。
  private _refreshMenu() {
    if (!this._menu) return
    this._setupMenuItems()
    this._positionMenu()
    this._hoverBinder.bind()
  }

  private _positionMenu() {
    const panel = this._menu?.panel
    if (!panel) return

    panel.style.visibility = 'hidden'
    panel.style.display = ''

    // 普通 overlay root 不经过 transformed containing block，保留轻量的同步定位。
    // 只有 panel 已进入 open native dialog 时才需要 Floating UI 解析坐标。
    if (!(panel.parentElement instanceof HTMLDialogElement && panel.parentElement.open)) {
      this._positionMenuInViewport(panel)
      return
    }

    void computePosition({ getBoundingClientRect: () => new DOMRect(this._x, this._y, 0, 0) }, panel, {
      strategy: 'fixed',
      placement: 'bottom-start',
      // crossAxis 必须显式开启：bottom-start 的 sideAxis 为 y，默认只钳制 x，
      // 视口下缘打开时菜单底部会溢出且无法滚动进入视野。
      middleware: [shift({ padding: 8, crossAxis: true })]
    }).then(({ x, y, middlewareData }) => {
      if (!this._isOpen || this._menu?.panel !== panel) return
      // dialog 相对坐标不能与 viewport 的 _x/_y 比较推导 origin（原点非零时几乎恒判
      // right/bottom）；shift 数据是该坐标系内的钳制位移增量，负值即被推向该轴起点侧。
      const shiftX = middlewareData.shift?.x ?? 0
      const shiftY = middlewareData.shift?.y ?? 0
      this._applyMenuPosition(panel, x, y, shiftX < 0 ? 'right' : 'left', shiftY < 0 ? 'bottom' : 'top')
    })
  }

  private _positionMenuInViewport(panel: HTMLElement) {
    const { width, height } = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = this._x
    let y = this._y

    if (x + width > vw) x = vw - width - 8
    if (y + height > vh) y = vh - height - 8
    if (x < 0) x = 8
    if (y < 0) y = 8

    this._applyMenuPosition(panel, x, y)
  }

  private _applyMenuPosition(
    panel: HTMLElement,
    x: number,
    y: number,
    horizontalOrigin?: 'left' | 'right',
    verticalOrigin?: 'top' | 'bottom'
  ) {
    panel.style.left = `${x}px`
    panel.style.top = `${y}px`
    // 非 dialog 路径保持 viewport 坐标比较；dialog 路径由调用方传入 shift 推导值。
    const horizontal = horizontalOrigin ?? (x < this._x ? 'right' : 'left')
    const vertical = verticalOrigin ?? (y < this._y ? 'bottom' : 'top')
    panel.style.setProperty('--wui-internal-overlay-transform-origin', `${vertical} ${horizontal}`)
    panel.style.visibility = ''
  }

  private _focusFirstItem() {
    const items = this._menu?.content.querySelectorAll<HTMLElement>('web-ui-dropdown-item:not([disabled])')
    const firstItem = items?.[0]
    if (firstItem) {
      focusMenuItem(firstItem)
    }
  }

  private _setupMenuItems() {
    const menu = this._menu
    if (!menu) return
    const content = menu.content

    reconcileManagedMenuItems(this, content, this._menuItemAnchors, MARKER_TEXT)
    this._hideMenuItems()
    // 宿主可能在菜单打开期间动态改写 slot 子内容（如切换上下文后重建嵌套子项），
    // 新节点没有隐藏 slot 会落入父项默认 slot 可见渲染并叠到一级菜单上；
    // 因此对已移入 content 的嵌套子项也要重新隐藏。
    hideNestedMenuChildren(content, 'context-menu-hidden')

    // 框架 v-if 注释锚点的复位独立于元素重排：无论元素序是否已变都要执行。
    // 若挂在「元素序已变才重排」之下，顺序恰好正确时会跳过复位，锚点漂移无法收敛，
    // 而 Vue 下次翻转正依赖锚点引导新分支项的插入点。
    const anchors = captureFrameworkAnchors(content, MARKER_TEXT)
    orderManagedMenuItems(this, content, this._menuItemAnchors, MARKER_TEXT)
    restoreFrameworkAnchors(content, anchors)
  }

  private _returnItemsToSlot() {
    const menu = this._menu
    if (!menu) return

    this._closeSubmenusFrom(0, true)
    this._closingSubmenus.restoreAll()

    returnManagedMenuItemsToSlot(this, menu.content, this._menuItemAnchors)
  }

  private async _closeMenuAfterPresence() {
    const menu = this._menu
    if (menu && !(await hideOverlayPresence(menu.panel))) return
    if (this._isOpen || !this.isConnected || this._menu !== menu) return

    this._returnItemsToSlot()
    menu?.panel.remove()
    this._menu = undefined
    this._restoreFocusTarget?.focus()
    this._restoreFocusTarget = undefined
  }

  private _hideMenuItems() {
    getMenuChildren(this).forEach(child => child.setAttribute('slot', 'context-menu-hidden'))
    hideNestedMenuChildren(this, 'context-menu-hidden')
  }

  private _openSubmenu(item: HTMLElement, isInstant = false) {
    if (!this._isOpen || !item.hasAttribute('submenu') || item.hasAttribute('disabled')) return

    const level = this._getItemLevel(item)
    if (level === -1 || this._activeSubmenuItems[level] === item) return

    this._closeSubmenusFrom(level)
    const closingSubmenu = this._closingSubmenus.take(item)
    if (closingSubmenu) {
      this._activeSubmenus[level] = closingSubmenu
      this._activeSubmenuItems[level] = item
      item.setAttribute('active', '')
      this._positionSubmenu(item, closingSubmenu)
      showOverlayPresence(closingSubmenu.panel, { isInstant })
      this._hoverBinder.bind()
      return
    }
    if (getMenuChildren(item).length === 0) return

    const submenu = createMenuPortalOverlay('context-submenu', this)
    submenu.panel.dataset.level = String(level)
    submenu.panel.setAttribute('role', 'menu')
    submenu.panel.setAttribute('aria-label', '子菜单')
    submenu.panel.style.visibility = 'hidden'
    submenu.panel.addEventListener('click', this._onMenuClick)
    moveMenuChildren(item, submenu.content)

    this._activeSubmenus[level] = submenu
    this._activeSubmenuItems[level] = item
    item.setAttribute('active', '')
    this._positionSubmenu(item, submenu)
    showOverlayPresence(submenu.panel, { isInstant })
    this._hoverBinder.bind()
  }

  private _closeSubmenusFrom(level: number, isInstant = false) {
    for (let index = this._activeSubmenus.length - 1; index >= level; index--) {
      const submenu = this._activeSubmenus[index]
      const item = this._activeSubmenuItems[index]
      item?.removeAttribute('active')
      if (!item || isInstant) {
        this._restoreSubmenuItems(submenu, item)
        submenu.panel.remove()
      } else {
        this._closingSubmenus.closeAsync(item, submenu)
      }
    }
    this._activeSubmenus.length = level
    this._activeSubmenuItems.length = level
  }

  private _restoreSubmenuItems(submenu: MenuPortalOverlay, item?: HTMLElement) {
    if (!item) return
    moveMenuChildren(submenu.content, item)
    // 子菜单打开期间宿主可能重建了嵌套子项，归还时补隐藏，避免可见叠加。
    hideNestedMenuChildren(item, 'context-menu-hidden')
  }

  private _getItemLevel(item: HTMLElement): number {
    const menu = this._menu
    if (menu?.panel.contains(item)) return 0
    const parentLevel = this._activeSubmenus.findIndex(submenu => submenu.panel.contains(item))
    return parentLevel === -1 ? -1 : parentLevel + 1
  }

  private _positionSubmenu(item: HTMLElement, submenu: MenuPortalOverlay) {
    // 与主菜单同因：panel 进入 open native dialog 后处于 transformed containing
    // block，viewport 坐标的 left/top 会相对 dialog padding box 解析而整体偏移，
    // 需改走 Floating UI 换算为 dialog 相对坐标；开合方向仍按视口坐标度量预判。
    if (submenu.panel.parentElement instanceof HTMLDialogElement && submenu.panel.parentElement.open) {
      const itemRect = item.getBoundingClientRect()
      const padding = 8
      const canOpenRight = itemRect.right + submenu.panel.getBoundingClientRect().width + padding <= window.innerWidth
      // 同帧关闭→重开会复用同一 panel 产生两个 in-flight 定位 promise，完成序不保证
      // 后者胜出；按 panel 键控的代数 token 只允许最新一次调用写入，迟到旧 promise 丢弃。
      const epoch = (this._submenuPositionEpochs.get(submenu.panel) ?? 0) + 1
      this._submenuPositionEpochs.set(submenu.panel, epoch)
      void computePosition(item, submenu.panel, {
        strategy: 'fixed',
        placement: canOpenRight ? 'right-start' : 'left-start',
        middleware: [shift({ padding, crossAxis: true })]
      }).then(({ x, y, middlewareData }) => {
        if (!this._activeSubmenus.includes(submenu) || epoch !== this._submenuPositionEpochs.get(submenu.panel)) return
        // 与主菜单 dialog 路径一致：origin 由 shift 增量推导，视口预判只决定 placement。
        const shiftX = middlewareData.shift?.x ?? 0
        const shiftY = middlewareData.shift?.y ?? 0
        const horizontalOrigin = shiftX < 0 ? 'right' : 'left'
        const verticalOrigin = shiftY < 0 ? 'bottom' : 'top'
        submenu.panel.style.left = `${x}px`
        submenu.panel.style.top = `${y}px`
        submenu.panel.style.setProperty(
          '--wui-internal-overlay-transform-origin',
          `${verticalOrigin} ${horizontalOrigin}`
        )
        submenu.panel.style.visibility = ''
      })
      return
    }

    const itemRect = item.getBoundingClientRect()
    const submenuRect = submenu.panel.getBoundingClientRect()
    const padding = 8
    const canOpenRight = itemRect.right + submenuRect.width + padding <= window.innerWidth
    const left = canOpenRight ? itemRect.right : Math.max(padding, itemRect.left - submenuRect.width)
    const top = Math.min(Math.max(padding, itemRect.top), window.innerHeight - submenuRect.height - padding)

    submenu.panel.style.left = `${left}px`
    submenu.panel.style.top = `${top}px`
    submenu.panel.style.setProperty('--wui-internal-overlay-transform-origin', canOpenRight ? 'top left' : 'top right')
    submenu.panel.style.visibility = ''
  }

  private _dispatchChange(open: boolean) {
    dispatchOpenChangeEvent(this, open)
  }

  private _onContextMenu = (e: MouseEvent) => {
    if (this.disabled) return
    e.preventDefault()
    this._restoreFocusTarget = e.target instanceof HTMLElement ? e.target : undefined
    if (this._openAt(e.clientX, e.clientY, false)) this._userOpenChange.mark()
  }

  private _onContextMenuOutside = (e: MouseEvent) => {
    if (this._isOpen && !this._outsideClickGuard.isInside(e)) {
      this._closeFromUser()
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled) return

    // 键盘 ContextMenu 键或 Shift+F10
    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault()
      const focused = document.activeElement
      if (focused && focused !== document.body) {
        const rect = focused.getBoundingClientRect()
        if (this._openAt(rect.left, rect.bottom, true)) this._userOpenChange.mark()
      } else {
        if (this._openAt(window.innerWidth / 2, window.innerHeight / 2, true)) this._userOpenChange.mark()
      }
      return
    }
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this._isOpen || this._outsideClickGuard.isArmed()) return
    if (this._outsideClickGuard.isInside(e)) return
    this._closeFromUser()
  }

  private _onMenuClick = (e: MouseEvent) => {
    const item = getMenuItemFromEvent(e)
    if (!item || item.hasAttribute('disabled')) return
    if (item.hasAttribute('submenu')) {
      this._openSubmenu(item)
      return
    }
    this._closeFromUser()
  }

  private _getLevelContainer(level: number) {
    return level === 0 ? this._menu : this._activeSubmenus[level - 1]
  }

  private _getLevelItems(level: number): HTMLElement[] {
    const container = this._getLevelContainer(level)
    if (!container) return []
    return getMenuChildren(container.content)
  }

  private _onWheel = (e: WheelEvent) => {
    this._preventBackgroundScroll(e)
  }

  private _onTouchMove = (e: TouchEvent) => {
    this._preventBackgroundScroll(e)
  }

  private _onDocumentKeydown = (e: KeyboardEvent) => {
    if (!this._isOpen) return
    // 鼠标右键打开的菜单焦点不在菜单内，e.target !== this 时也必须能 Escape 关闭；
    // 菜单为模态浮层，按 Escape 即关闭，无需限定焦点位置
    handleMenuKeyboard(this._keyboardDelegate, e)
  }

  private _closeLastSubmenuOrMenu() {
    if (this._activeSubmenus.length > 0) {
      const level = this._activeSubmenus.length - 1
      const parent = this._activeSubmenuItems[level]
      this._closeSubmenusFrom(level)
      focusMenuItem(parent)
      this._hoverBinder.bind()
    } else {
      this._closeFromUser()
    }
  }

  private _preventBackgroundScroll(e: Event) {
    if (!this._isOpen || this.noScrollLock || this._isMenuPanelEvent(e)) return
    e.preventDefault()
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _isMenuPanelEvent(e: Event): boolean {
    return e
      .composedPath()
      .some(
        node =>
          node instanceof HTMLElement &&
          (node.classList.contains('context-menu') || node.classList.contains('context-submenu'))
      )
  }

  override render() {
    return html`
      <div class="context-menu-anchor">
        <slot @slotchange=${this._onSlotChange}></slot>
      </div>
    `
  }

  private _onSlotChange() {
    this._hideMenuItems()
    // 打开期间宿主重建顶层项时，新成员要移入 portal 才对用户可见；
    // 关闭状态下无需移动，等下次打开时由 _setupMenuItems 统一处理。
    if (this._isOpen) this._scheduleRefresh()
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-context-menu': WebUiContextMenu
  }
}
