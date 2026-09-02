import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/dropdown-divider'
import '@/components/dropdown-header'
import '@/components/dropdown-item'
import { UserChangeController } from '@/shared/events/user-change'
import { createMenuPortalOverlay, type MenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import {
  findFocusedMenuItem,
  focusMenuItem,
  getEnabledMenuItems,
  getMenuChildren,
  getMenuItemFromEvent,
  getMovableMenuSubtrees,
  hideNestedMenuChildren,
  moveMenuChildren
} from '@/shared/menu-portal/menu-tree'
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
  private readonly _closingSubmenus = new Map<HTMLElement, MenuPortalOverlay>()
  private _submenuTimer?: ReturnType<typeof setTimeout>
  private _ignoreOutsideClick = false
  private _ignoreOutsideClickTimer?: ReturnType<typeof setTimeout>
  private _hoverCleanupFns: (() => void)[] = []
  private _menu?: MenuPortalOverlay
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
    clearTimeout(this._submenuTimer)
    clearTimeout(this._ignoreOutsideClickTimer)
    this._hoverCleanupFns.forEach(cleanup => cleanup())
    this._scrollLock.release()
    this._returnItemsToSlot()
    this._menu?.panel.remove()
    this._menu = undefined
    this._closeSubmenusFrom(0, true)
    this._restoreClosingSubmenus()
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
    this._ignoreCurrentOutsideClick()
    if (this._isOpen) {
      this._closeSubmenusFrom(0, true)
      this._restoreClosingSubmenus()
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
    this._bindLevelHovers()
  }

  private _positionMenu() {
    const panel = this._menu?.panel
    if (!panel) return

    panel.style.visibility = 'hidden'
    panel.style.display = ''

    const { width, height } = panel.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = this._x
    let y = this._y

    if (x + width > vw) x = vw - width - 8
    if (y + height > vh) y = vh - height - 8
    if (x < 0) x = 8
    if (y < 0) y = 8

    panel.style.left = `${x}px`
    panel.style.top = `${y}px`
    const horizontalOrigin = x < this._x ? 'right' : 'left'
    const verticalOrigin = y < this._y ? 'bottom' : 'top'
    panel.style.setProperty('--wui-internal-overlay-transform-origin', `${verticalOrigin} ${horizontalOrigin}`)
    panel.style.visibility = ''
  }

  private _focusFirstItem() {
    const items = this._menu?.content.querySelectorAll<HTMLElement>('web-ui-dropdown-item:not([disabled])')
    const firstItem = items?.[0]
    if (firstItem) {
      this._focusMenuItem(firstItem)
    }
  }

  private _setupMenuItems() {
    const menu = this._menu
    if (!menu) return
    const content = menu.content

    this._syncManagedItems(content)
    this._hideMenuItems()
    // 宿主可能在菜单打开期间动态改写 slot 子内容（如切换上下文后重建嵌套子项），
    // 新节点没有隐藏 slot 会落入父项默认 slot 可见渲染并叠到一级菜单上；
    // 因此对已移入 content 的嵌套子项也要重新隐藏。
    hideNestedMenuChildren(content, 'context-menu-hidden')
    this._orderMenuItems(content)
  }

  /**
   * 全集 reconcile：以「content 现有元素 ∪ 宿主元素」为托管全集。
   * 框架（如 Vue 的 v-if 翻转）可能不经宿主直接改写 portal 内节点——卸载旧项留下
   * 注释锚点、把新项直接插进 content——它们都会被这里收编（补 marker + 补隐藏），
   * 已被框架删除/移出两处的条目则被清理。
   */
  private _syncManagedItems(content: HTMLElement) {
    // 宿主与 portal 面板分别位于不同容器，结构上不相交且收集只看直接子层，
    // 两个集合不会重复。
    const inContent = getMovableMenuSubtrees(content)
    const inHost = getMovableMenuSubtrees(this)
    const managed = new Set([...inContent, ...inHost])

    // 清理已失效条目：托管元素既不在 content 也不在宿主，说明已被框架删除。
    // 仍在 content 的元素必被上面收集进 managed，故这里只需处理宿主侧。
    this._menuItemAnchors.forEach((marker, subtree) => {
      if (managed.has(subtree)) return
      marker.remove()
      this._menuItemAnchors.delete(subtree)
    })

    // 确保每个托管元素都有 marker：框架直接插入 content 的项在此收编。
    // content 项按其当前 DOM 序（框架语义序）**反向**处理，新 marker 插到后继项 marker 之前——
    // 这样补建的 marker 序无需重排即可与 content 对齐；宿主项的 marker 原地补插。
    const ensureMarker = (subtree: HTMLElement, inHost: boolean, before?: Comment) => {
      const existing = this._menuItemAnchors.get(subtree)
      if (existing && existing.parentNode === this) return existing
      existing?.remove()
      const marker = document.createComment(MARKER_TEXT)
      if (inHost) {
        this.insertBefore(marker, subtree)
      } else if (before && before.parentNode === this) {
        this.insertBefore(marker, before)
      } else {
        this.appendChild(marker)
      }
      this._menuItemAnchors.set(subtree, marker)
      return marker
    }
    for (let index = inContent.length - 1; index >= 0; index--) {
      const subtree = inContent[index]
      const next = inContent[index + 1]
      const nextMarker = next ? this._menuItemAnchors.get(next) : undefined
      ensureMarker(subtree, false, nextMarker)
    }
    for (const subtree of inHost) {
      ensureMarker(subtree, true)
    }

    // 宿主中尚存的托管项移入 content。
    for (const subtree of inHost) {
      content.appendChild(subtree)
    }
  }

  private _orderMenuItems(content: HTMLElement) {
    const targetItems: HTMLElement[] = []
    for (const node of Array.from(this.childNodes)) {
      if (node.nodeType !== Node.COMMENT_NODE || node.textContent !== MARKER_TEXT) continue
      this._menuItemAnchors.forEach((marker, subtree) => {
        if (marker !== node || subtree.parentNode !== content) return
        targetItems.push(subtree)
      })
    }

    const currentItems = Array.from(content.children)
    const isOrdered =
      currentItems.length === targetItems.length && currentItems.every((item, index) => item === targetItems[index])
    if (isOrdered) return

    targetItems.forEach(subtree => {
      content.appendChild(subtree)
    })
  }

  private _returnItemsToSlot() {
    const menu = this._menu
    if (!menu) return

    this._closeSubmenusFrom(0, true)
    this._restoreClosingSubmenus()

    // 按 content 子节点序双向归还：元素回到 marker 位置，框架 v-if 注释锚点
    // 插到对应元素之前。Vue 仍持有这些锚点的 vnode.el 引用，随元素一起迁回宿主
    // 可确保框架下次 patch 以宿主为容器，不会因 parentNode === null 崩溃。
    const content = menu.content
    const pending: Comment[] = []
    for (const node of Array.from(content.childNodes)) {
      // instanceof 收窄：Comment 接口为空，nodeType 继承自 Node 的 number，无法用 === 收窄
      if (node instanceof Comment) {
        pending.push(node)
        continue
      }
      if (!(node instanceof HTMLElement)) continue
      const marker = this._menuItemAnchors.get(node)
      if (!marker) continue
      for (const c of pending) {
        if (marker.parentNode === this) this.insertBefore(c, marker)
        else this.appendChild(c)
      }
      pending.length = 0
      if (marker.parentNode === this) {
        this.insertBefore(node, marker)
      } else {
        this.appendChild(node)
      }
      marker.remove()
      this._menuItemAnchors.delete(node)
    }
    // 尾部框架锚点追加到宿主末尾
    for (const c of pending) this.appendChild(c)
    // 映射中剩余 = 已不在 content 的条目(如翻转中被框架卸载的),仅清理 marker
    this._menuItemAnchors.forEach(marker => marker.remove())
    this._menuItemAnchors.clear()
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
    const closingSubmenu = this._closingSubmenus.get(item)
    if (closingSubmenu) {
      this._closingSubmenus.delete(item)
      this._activeSubmenus[level] = closingSubmenu
      this._activeSubmenuItems[level] = item
      item.setAttribute('active', '')
      this._positionSubmenu(item, closingSubmenu)
      showOverlayPresence(closingSubmenu.panel, { isInstant })
      this._bindLevelHovers()
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
    this._bindLevelHovers()
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
        this._closingSubmenus.set(item, submenu)
        void this._closeSubmenuAfterPresence(submenu, item)
      }
    }
    this._activeSubmenus.length = level
    this._activeSubmenuItems.length = level
  }

  private async _closeSubmenuAfterPresence(submenu: MenuPortalOverlay, item: HTMLElement) {
    if (!(await hideOverlayPresence(submenu.panel))) return
    if (this._closingSubmenus.get(item) !== submenu) return

    this._closingSubmenus.delete(item)
    this._restoreSubmenuItems(submenu, item)
    submenu.panel.remove()
  }

  private _restoreSubmenuItems(submenu: MenuPortalOverlay, item?: HTMLElement) {
    if (!item) return
    moveMenuChildren(submenu.content, item)
    // 子菜单打开期间宿主可能重建了嵌套子项，归还时补隐藏，避免可见叠加。
    hideNestedMenuChildren(item, 'context-menu-hidden')
  }

  private _restoreClosingSubmenus() {
    this._closingSubmenus.forEach((submenu, item) => {
      this._restoreSubmenuItems(submenu, item)
      submenu.panel.remove()
    })
    this._closingSubmenus.clear()
  }

  private _getItemLevel(item: HTMLElement): number {
    const menu = this._menu
    if (menu?.panel.contains(item)) return 0
    const parentLevel = this._activeSubmenus.findIndex(submenu => submenu.panel.contains(item))
    return parentLevel === -1 ? -1 : parentLevel + 1
  }

  private _positionSubmenu(item: HTMLElement, submenu: MenuPortalOverlay) {
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
    this.dispatchEvent(
      new CustomEvent('open-change', {
        detail: { open },
        bubbles: true,
        composed: true
      })
    )
  }

  private _isInsideShadowRoot(e: MouseEvent): boolean {
    for (const node of e.composedPath()) {
      if (node === this || node === this.shadowRoot) return true
      if (node instanceof Node && node.getRootNode() === this.shadowRoot) return true
      if (
        node instanceof Node &&
        (this._menu?.panel.contains(node) || this._activeSubmenus.some(menu => menu.panel.contains(node)))
      ) {
        return true
      }
    }
    return false
  }

  private _onContextMenu = (e: MouseEvent) => {
    if (this.disabled) return
    e.preventDefault()
    this._restoreFocusTarget = e.target instanceof HTMLElement ? e.target : undefined
    if (this._openAt(e.clientX, e.clientY, false)) this._userOpenChange.mark()
  }

  private _onContextMenuOutside = (e: MouseEvent) => {
    if (this._isOpen && !this._isInsideShadowRoot(e)) {
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
    if (!this._isOpen || this._ignoreOutsideClick) return
    if (this._isInsideShadowRoot(e)) return
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

  private _getLevelItems(level: number): HTMLElement[] {
    const container = level === 0 ? this._menu?.content : this._activeSubmenus[level - 1]?.content
    if (!container) return []
    return getMenuChildren(container)
  }

  private _bindLevelHovers() {
    this._hoverCleanupFns.forEach(cleanup => cleanup())
    this._hoverCleanupFns.length = 0

    for (let level = 0; level <= this._activeSubmenus.length; level++) {
      this._getLevelItems(level).forEach(item => {
        if (!item.matches('web-ui-dropdown-item') || item.hasAttribute('disabled')) return
        const handler = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return
          clearTimeout(this._submenuTimer)
          if (item.hasAttribute('submenu')) {
            if (this._activeSubmenuItems[level] !== item) {
              this._submenuTimer = setTimeout(() => this._openSubmenu(item), 200)
            }
          } else if (this._activeSubmenus.length > level) {
            this._closeSubmenusFrom(level)
            this._bindLevelHovers()
          }
        }
        item.addEventListener('pointerenter', handler, { passive: true })
        this._hoverCleanupFns.push(() => item.removeEventListener('pointerenter', handler))
      })
    }
  }

  private _ignoreCurrentOutsideClick() {
    this._ignoreOutsideClick = true
    clearTimeout(this._ignoreOutsideClickTimer)
    this._ignoreOutsideClickTimer = setTimeout(() => {
      this._ignoreOutsideClick = false
    })
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
    if (e.key === 'Escape') {
      this._closeLastSubmenuOrMenu()
      e.preventDefault()
      return
    }
    const level = this._getFocusedLevel()
    if (level === undefined) return
    const items = this._getEnabledLevelItems(level)
    const focused = this._getFocusedItem()
    const currentIndex = focused ? items.indexOf(focused) : -1

    switch (e.key) {
      case 'ArrowDown':
        this._focusMenuItem(items[(currentIndex + 1 + items.length) % items.length])
        break
      case 'ArrowUp':
        this._focusMenuItem(items[(currentIndex - 1 + items.length) % items.length])
        break
      case 'Home':
        this._focusMenuItem(items[0])
        break
      case 'End':
        this._focusMenuItem(items.at(-1))
        break
      case 'ArrowRight':
        if (focused?.hasAttribute('submenu')) {
          this._openSubmenu(focused, true)
          requestAnimationFrame(() => this._focusMenuItem(this._getEnabledLevelItems(level + 1)[0]))
        }
        break
      case 'ArrowLeft':
        if (level > 0) {
          const parent = this._activeSubmenuItems[level - 1]
          this._closeSubmenusFrom(level - 1)
          this._focusMenuItem(parent)
          this._bindLevelHovers()
        }
        break
      case 'Enter':
      case ' ':
        focused?.click()
        break
      case 'Escape':
        this._closeLastSubmenuOrMenu()
        break
      default:
        return
    }
    e.preventDefault()
  }

  private _closeLastSubmenuOrMenu() {
    if (this._activeSubmenus.length > 0) {
      const level = this._activeSubmenus.length - 1
      const parent = this._activeSubmenuItems[level]
      this._closeSubmenusFrom(level)
      this._focusMenuItem(parent)
      this._bindLevelHovers()
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

  private _getEnabledLevelItems(level: number) {
    const container = level === 0 ? this._menu?.content : this._activeSubmenus[level - 1]?.content
    return container ? getEnabledMenuItems(container) : []
  }

  private _getFocusedItem(): HTMLElement | undefined {
    return findFocusedMenuItem([this._menu?.content, ...this._activeSubmenus.map(submenu => submenu.content)])
  }

  private _getFocusedLevel(): number | undefined {
    const item = this._getFocusedItem()
    if (!item) return undefined
    if (this._menu?.panel.contains(item)) return 0
    const submenuIndex = this._activeSubmenus.findIndex(menu => menu.panel.contains(item))
    return submenuIndex < 0 ? undefined : submenuIndex + 1
  }

  private _focusMenuItem(item: HTMLElement | undefined) {
    focusMenuItem(item)
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
