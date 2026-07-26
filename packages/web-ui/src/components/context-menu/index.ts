import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { createMenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

@customElement('web-ui-context-menu')
export class WebUiContextMenu extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true

  @state() private _isOpen = false
  @state() private _x = 0
  @state() private _y = 0

  private _activeSubmenus: HTMLElement[] = []
  private _activeSubmenuItems: HTMLElement[] = []
  private _submenuTimer?: ReturnType<typeof setTimeout>
  private _ignoreOutsideClick = false
  private _ignoreOutsideClickTimer?: ReturnType<typeof setTimeout>
  private _hoverCleanupFns: (() => void)[] = []
  private _menu?: HTMLElement
  private _hasScrollLock = false
  private _restoreFocusTarget?: HTMLElement

  /** 当前菜单是否打开 */
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
    clearTimeout(this._submenuTimer)
    clearTimeout(this._ignoreOutsideClickTimer)
    this._hoverCleanupFns.forEach(cleanup => cleanup())
    if (this._hasScrollLock) {
      unlockScroll()
      this._hasScrollLock = false
    }
    this._returnItemsToSlot()
    this._menu?.remove()
    this._menu = undefined
    this._closeSubmenusFrom(0)
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
        this._menu = createMenuPortalOverlay('context-menu', this)
        this._menu.setAttribute('role', 'menu')
        this._menu.setAttribute('aria-label', '上下文菜单')
        this._menu.addEventListener('click', this._onMenuClick)
        requestAnimationFrame(() => {
          this._setupMenuItems()
          this._positionMenu()
          this._focusFirstItem()
          this._bindLevelHovers()
        })
      } else {
        this._syncScrollLock(false)
        this._returnItemsToSlot()
        this._menu?.remove()
        this._menu = undefined
        this._restoreFocusTarget?.focus()
        this._restoreFocusTarget = undefined
      }
      this._dispatchChange(this._isOpen)
    }
    if (changed.has('lockScroll')) this._syncScrollLock()
  }

  /** 在指定坐标打开菜单 */
  openAt(x: number, y: number) {
    if (this.disabled) return
    this._x = x
    this._y = y
    this._ignoreCurrentOutsideClick()
    if (this._isOpen) {
      requestAnimationFrame(() => this._positionMenu())
      return
    }
    this._restoreFocusTarget ??= document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    this._isOpen = true
  }

  /** 关闭菜单 */
  close() {
    if (!this._isOpen) return
    this._isOpen = false
  }

  private _positionMenu() {
    const menu = this._menu
    if (!menu) return

    menu.style.visibility = 'hidden'
    menu.style.display = ''

    const { width, height } = menu.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight

    let x = this._x
    let y = this._y

    if (x + width > vw) x = vw - width - 8
    if (y + height > vh) y = vh - height - 8
    if (x < 0) x = 8
    if (y < 0) y = 8

    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
    menu.style.visibility = ''
  }

  private _focusFirstItem() {
    const menu = this._menu
    const items = menu?.querySelectorAll<HTMLElement>('web-ui-dropdown-item:not([disabled])')
    const firstItem = items?.[0]
    if (firstItem) {
      this._focusMenuItem(firstItem)
    }
  }

  private _setupMenuItems() {
    const menu = this._menu
    if (!menu) return

    this._hideMenuItems()
    Array.from(this.children).forEach(child => {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        menu.appendChild(child)
      }
    })
  }

  private _returnItemsToSlot() {
    const menu = this._menu
    if (!menu) return

    this._closeSubmenusFrom(0)
    Array.from(menu.children).forEach(child => {
      this.appendChild(child)
    })
  }

  private _hideMenuItems() {
    Array.from(this.children).forEach(child => {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        child.setAttribute('slot', 'context-menu-hidden')
      }
    })
    this.querySelectorAll<HTMLElement>('web-ui-dropdown-item[submenu]').forEach(item => {
      Array.from(item.children).forEach(child => {
        if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
          child.setAttribute('slot', 'context-menu-hidden')
        }
      })
    })
  }

  private _openSubmenu(item: HTMLElement) {
    if (!this._isOpen || !item.hasAttribute('submenu') || item.hasAttribute('disabled')) return

    const level = this._getItemLevel(item)
    if (level === -1 || this._activeSubmenuItems[level] === item) return

    this._closeSubmenusFrom(level)
    const children = Array.from(item.children).filter(child =>
      child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')
    )
    if (children.length === 0) return

    const submenu = createMenuPortalOverlay('context-submenu', this)
    submenu.dataset.level = String(level)
    submenu.setAttribute('role', 'menu')
    submenu.setAttribute('aria-label', '子菜单')
    submenu.style.visibility = 'hidden'
    submenu.addEventListener('click', this._onMenuClick)
    children.forEach(child => submenu.appendChild(child))

    this._activeSubmenus[level] = submenu
    this._activeSubmenuItems[level] = item
    item.setAttribute('active', '')
    this._positionSubmenu(item, submenu)
    this._bindLevelHovers()
  }

  private _closeSubmenusFrom(level: number) {
    for (let index = this._activeSubmenus.length - 1; index >= level; index--) {
      const submenu = this._activeSubmenus[index]
      const item = this._activeSubmenuItems[index]
      Array.from(submenu.children).forEach(child => item?.appendChild(child))
      item?.removeAttribute('active')
      submenu.remove()
    }
    this._activeSubmenus.length = level
    this._activeSubmenuItems.length = level
  }

  private _getItemLevel(item: HTMLElement): number {
    const menu = this._menu
    if (menu?.contains(item)) return 0
    const parentLevel = this._activeSubmenus.findIndex(submenu => submenu.contains(item))
    return parentLevel === -1 ? -1 : parentLevel + 1
  }

  private _positionSubmenu(item: HTMLElement, submenu: HTMLElement) {
    const itemRect = item.getBoundingClientRect()
    const submenuRect = submenu.getBoundingClientRect()
    const padding = 8
    const canOpenRight = itemRect.right + submenuRect.width + padding <= window.innerWidth
    const left = canOpenRight ? itemRect.right : Math.max(padding, itemRect.left - submenuRect.width)
    const top = Math.min(Math.max(padding, itemRect.top), window.innerHeight - submenuRect.height - padding)

    submenu.style.left = `${left}px`
    submenu.style.top = `${top}px`
    submenu.style.visibility = ''
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
        (this._menu?.contains(node) || this._activeSubmenus.some(menu => menu.contains(node)))
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
    this.openAt(e.clientX, e.clientY)
  }

  private _onContextMenuOutside = (e: MouseEvent) => {
    if (this._isOpen && !this._isInsideShadowRoot(e)) {
      this.close()
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
        this.openAt(rect.left, rect.bottom)
      } else {
        this.openAt(window.innerWidth / 2, window.innerHeight / 2)
      }
      return
    }
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this._isOpen || this._ignoreOutsideClick) return
    if (this._isInsideShadowRoot(e)) return
    this.close()
  }

  private _onMenuClick = (e: MouseEvent) => {
    const item = this._getDropdownItemFromEvent(e)
    if (!item || item.hasAttribute('disabled')) return
    if (item.hasAttribute('submenu')) {
      this._openSubmenu(item)
      return
    }
    this.close()
  }

  private _getDropdownItemFromEvent(e: Event): HTMLElement | null {
    return (
      e
        .composedPath()
        .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches('web-ui-dropdown-item')) ??
      null
    )
  }

  private _getLevelItems(level: number): HTMLElement[] {
    const container = level === 0 ? this._menu : this._activeSubmenus[level - 1]
    if (!container) return []
    return Array.from(container.children).filter((child): child is HTMLElement =>
      child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')
    )
  }

  private _bindLevelHovers() {
    this._hoverCleanupFns.forEach(cleanup => cleanup())
    this._hoverCleanupFns.length = 0

    for (let level = 0; level <= this._activeSubmenus.length; level++) {
      this._getLevelItems(level).forEach(item => {
        if (!item.matches('web-ui-dropdown-item') || item.hasAttribute('disabled')) return
        const handler = () => {
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
    if (e.key === 'Escape' && e.target === this) {
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
          this._openSubmenu(focused)
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
      this.close()
    }
  }

  private _preventBackgroundScroll(e: Event) {
    if (!this._isOpen || !this.lockScroll || this._isMenuPanelEvent(e)) return
    e.preventDefault()
  }

  private _syncScrollLock(isOpen = this._isOpen) {
    const shouldLock = isOpen && this.lockScroll
    if (shouldLock === this._hasScrollLock) return

    if (shouldLock) lockScroll()
    else unlockScroll()
    this._hasScrollLock = shouldLock
  }

  private _getEnabledLevelItems(level: number) {
    return this._getLevelItems(level).filter(item => item.matches('web-ui-dropdown-item:not([disabled])'))
  }

  private _getFocusedItem(): HTMLElement | undefined {
    return [this._menu, ...this._activeSubmenus]
      .filter((menu): menu is HTMLElement => menu !== undefined)
      .flatMap(menu => Array.from(menu.querySelectorAll<HTMLElement>('web-ui-dropdown-item')))
      .find(item => Boolean(item.shadowRoot?.activeElement))
  }

  private _getFocusedLevel(): number | undefined {
    const item = this._getFocusedItem()
    if (!item) return undefined
    if (this._menu?.contains(item)) return 0
    const submenuIndex = this._activeSubmenus.findIndex(menu => menu.contains(item))
    return submenuIndex < 0 ? undefined : submenuIndex + 1
  }

  private _focusMenuItem(item: HTMLElement | undefined) {
    if (!item || item.hasAttribute('disabled')) return
    const focusable = item as HTMLElement & { focusItem?: () => void }
    focusable.focusItem?.()
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
        <slot @slotchange=${this._hideMenuItems}></slot>
      </div>
    `
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
