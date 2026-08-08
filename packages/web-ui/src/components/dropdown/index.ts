import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import '@/components/dropdown-divider'
import '@/components/dropdown-header'
import '@/components/dropdown-item'
import { UserChangeController } from '@/shared/events/user-change'
import { createMenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import {
  findFocusedMenuItem,
  focusMenuItem,
  getEnabledMenuItems,
  getMenuChildren,
  getMenuItemFromEvent,
  hideNestedMenuChildren,
  moveMenuChildren
} from '@/shared/menu-portal/menu-tree'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { defineOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'
import { createScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

export type { Placement }

const SLOT_PREFIX = 'web-ui-menu-level-'
const ALLOWED_PLACEMENTS = [
  'top',
  'top-start',
  'top-end',
  'right',
  'right-start',
  'right-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end'
] as const

interface MenuOverlay {
  api: OverlayApi
  overlay: HTMLElement
  content: HTMLElement
}

@customElement('web-ui-dropdown')
export class WebUiDropdown extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true, attribute: 'match-width' }) matchWidth = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false

  private _placement: Placement = 'bottom-start'

  @property({ type: String, reflect: true })
  get placement(): Placement {
    return this._placement
  }
  set placement(v: string) {
    this._placement = normalizeLiteral(v, ALLOWED_PLACEMENTS, 'bottom-start')
  }

  private _offset = 4

  @property({ type: Number })
  get offset(): number {
    return this._offset
  }
  set offset(v: number) {
    this._offset = normalizeNumber(v, 0, 100, 4)
  }

  @state() private _activePath: number[] = []

  private readonly _overlays = new Map<number, MenuOverlay>()
  private readonly _closingSubmenuOverlays = new Map<HTMLElement, MenuOverlay>()
  private _openTimer?: ReturnType<typeof setTimeout>
  private _ignoreOutsideClick = false
  private _ignoreOutsideClickTimer?: ReturnType<typeof setTimeout>
  private _hoverCleanupFns: (() => void)[] = []
  private readonly _scrollLock = createScrollLockLease()
  private readonly _userOpenChange = new UserChangeController()
  private _restoreFocusTarget?: HTMLElement
  private _shouldOpenInstantly = true

  get isOpen(): boolean {
    return this.open || this._activePath.length > 0
  }

  override connectedCallback() {
    super.connectedCallback()
    this.addEventListener('keydown', this._onKeydown)
    document.addEventListener('click', this._onClickOutside)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('keydown', this._onKeydown)
    document.removeEventListener('click', this._onClickOutside)
    clearTimeout(this._openTimer)
    clearTimeout(this._ignoreOutsideClickTimer)
    this._scrollLock.release()
    this._cleanupClosedMenu()
    this._hoverCleanupFns.forEach(fn => fn())
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._restoreFocusTarget ??= document.activeElement instanceof HTMLElement ? document.activeElement : undefined
        this._ignoreCurrentOutsideClick()
        this._syncScrollLock()
        this._hideAllSubmenuChildren()
        requestAnimationFrame(() => {
          if (!this.open) return
          this._ensureOverlay(0, this._shouldOpenInstantly)
          this._shouldOpenInstantly = true
          this._focusMenuItem(this._getEnabledLevelItems(0)[0])
        })
        this._bindHoversAfterUpdate()
      } else {
        this._syncScrollLock()
        void this._closeRootAfterPresence()
      }
      if (this._userOpenChange.consume()) {
        this.dispatchEvent(
          new CustomEvent('open-change', {
            detail: { open: this.open },
            bubbles: true,
            composed: true
          })
        )
      }
    }
    if (changed.has('noScrollLock')) this._syncScrollLock()
    if (changed.has('placement') || changed.has('offset') || changed.has('matchWidth')) {
      this._overlays.get(0)?.api.update({
        placement: this.placement,
        offset: this.offset,
        matchWidth: this.matchWidth
      })
    }
    this._bindLevelHovers()
  }

  /** 打开菜单（命令式，不派发 `open-change`）。 */
  openMenu() {
    this._openMenu(true, false)
  }

  private _openMenu(isInstant: boolean, fromUser: boolean) {
    if (this.disabled || this.open) return
    this._ignoreCurrentOutsideClick()
    this._shouldOpenInstantly = isInstant
    if (fromUser) this._userOpenChange.mark()
    this.open = true
  }

  /** 关闭所有层级（命令式，不派发 `open-change`）。 */
  closeAll() {
    this._closeAll(false)
  }

  private _closeAll(fromUser: boolean) {
    if (!this.open) return
    if (fromUser) this._userOpenChange.mark()
    this.open = false
  }

  /** 清理子菜单状态（不影响 open prop） */
  private _closeAllSubmenus() {
    this._closeSubmenuFrom(1, true)
    this._disposeClosingSubmenuOverlays()
    this._syncActiveAttrs()
  }

  private _cleanupClosedMenu() {
    this._closeAllSubmenus()
    this._returnLevel0Items()
    this._disposeAll()
  }

  private async _closeRootAfterPresence() {
    const overlay = this._overlays.get(0)?.overlay
    if (overlay && !(await hideOverlayPresence(overlay))) return
    if (this.open || !this.isConnected) return

    this._cleanupClosedMenu()
    this._restoreFocusTarget?.focus()
    this._restoreFocusTarget = undefined
  }

  private _hideAllSubmenuChildren() {
    hideNestedMenuChildren(this, `${SLOT_PREFIX}-hidden`)
  }

  private _toggleSubmenu(level: number, itemIndex: number, isInstant = false) {
    if (this._activePath[level] === itemIndex) {
      return
    }

    this._closeSubmenuFrom(level + 1)

    this._activePath = [...this._activePath.slice(0, level), itemIndex]
    this._syncActiveAttrs()

    const item = this._getLevelItems(level)[itemIndex]
    if (item?.hasAttribute('submenu')) {
      requestAnimationFrame(() => {
        if (!this.open || this._activePath[level] !== itemIndex) return
        const restored = this._ensureOverlay(level + 1, isInstant, item)
        if (!restored) this._populateOverlay(level + 1, item)
      })
    }

    this._bindHoversAfterUpdate()
  }

  private _closeSubmenuFrom(level: number, isInstant = false) {
    for (let lv = this._activePath.length; lv >= level; lv--) {
      const overlay = this._overlays.get(lv)
      const parentItem = this._getLevelItems(lv - 1)[this._activePath[lv - 1]]
      if (!overlay) continue

      if (!parentItem || isInstant) {
        this._depopulateOverlay(lv, parentItem)
        this._disposeOverlay(lv)
      } else {
        this._overlays.delete(lv)
        this._closingSubmenuOverlays.set(parentItem, overlay)
        void this._closeSubmenuAfterPresence(overlay, parentItem)
      }
    }
    const nextActivePath = this._activePath.slice(0, level - 1)
    if (nextActivePath.length !== this._activePath.length) {
      this._activePath = nextActivePath
    }
    this._syncActiveAttrs()
  }

  private _syncActiveAttrs() {
    this.querySelectorAll('web-ui-dropdown-item').forEach(item => {
      item.removeAttribute('active')
    })
    this._overlays.forEach((_, level) => {
      this._getLevelItems(level).forEach(item => item.removeAttribute('active'))
    })
    this._activePath.forEach((itemIndex, level) => {
      const item = this._getLevelItems(level)[itemIndex]
      if (item?.matches('web-ui-dropdown-item')) {
        item.setAttribute('active', '')
      }
    })
  }

  private _getLevelItems(level: number): HTMLElement[] {
    const content = this._overlays.get(level)?.content
    return content ? getMenuChildren(content) : []
  }

  private _populateLevel0() {
    const content = this._overlays.get(0)?.content
    if (content) moveMenuChildren(this, content)
  }

  private _returnLevel0Items() {
    const content = this._overlays.get(0)?.content
    if (content) moveMenuChildren(content, this)
  }

  private _populateOverlay(level: number, submenuItem: HTMLElement) {
    const content = this._overlays.get(level)?.content
    if (content) moveMenuChildren(submenuItem, content)
  }

  private _depopulateOverlay(level: number, parentItem?: HTMLElement) {
    const content = this._overlays.get(level)?.content
    if (!content) return
    const targetLevel = level - 1
    const submenuItem = parentItem ?? this._getLevelItems(targetLevel)[this._activePath[targetLevel]]
    if (submenuItem) moveMenuChildren(content, submenuItem)
  }

  private _ensureOverlay(level: number, isInstant = false, submenuItem?: HTMLElement): boolean {
    const closingOverlay = submenuItem ? this._closingSubmenuOverlays.get(submenuItem) : undefined
    if (closingOverlay) {
      this._closingSubmenuOverlays.delete(submenuItem!)
      this._overlays.set(level, closingOverlay)
      closingOverlay.api.open()
      showOverlayPresence(closingOverlay.overlay, { isInstant })
      return true
    }
    const existing = this._overlays.get(level)
    if (existing) {
      existing.api.open()
      showOverlayPresence(existing.overlay, { isInstant })
      return false
    }
    this._buildOverlay(level, isInstant)
    return false
  }

  private _buildOverlay(level: number, isInstant = false) {
    const { panel: overlay, content } = createMenuPortalOverlay('dropdown-overlay')
    overlay.setAttribute('role', 'menu')
    overlay.dataset.level = String(level)
    overlay.addEventListener('click', this._onMenuClick)
    overlay.addEventListener('keydown', this._onKeydown)

    const anchor = level === 0 ? this._queryTriggerAnchor() : this._getSubmenuTriggerAnchor(level - 1)

    if (anchor) {
      const ctrl = defineOverlay().make({
        anchor,
        overlay,
        placement: level === 0 ? this.placement : 'right-start',
        offset: level === 0 ? this.offset : 0,
        matchWidth: level === 0 ? this.matchWidth : false,
        strategy: 'fixed'
      })
      this._overlays.set(level, { api: ctrl, overlay, content })
      if (level === 0) this._populateLevel0()
      ctrl.open()
      showOverlayPresence(overlay, { isInstant })
    }
  }

  private _disposeOverlay(level: number) {
    const overlay = this._overlays.get(level)?.overlay
    overlay?.removeEventListener('click', this._onMenuClick)
    overlay?.removeEventListener('keydown', this._onKeydown)
    overlay?.remove()
    this._overlays.get(level)?.api.dispose()
    this._overlays.delete(level)
  }

  private _disposeAll() {
    for (const level of this._overlays.keys()) {
      this._disposeOverlay(level)
    }
  }

  private async _closeSubmenuAfterPresence(overlay: MenuOverlay, parentItem: HTMLElement) {
    if (!(await hideOverlayPresence(overlay.overlay))) return
    if (this._closingSubmenuOverlays.get(parentItem) !== overlay) return

    this._closingSubmenuOverlays.delete(parentItem)
    this._restoreSubmenuItems(overlay, parentItem)
    overlay.api.dispose()
    overlay.overlay.remove()
  }

  private _disposeClosingSubmenuOverlays() {
    this._closingSubmenuOverlays.forEach((overlay, parentItem) => {
      this._restoreSubmenuItems(overlay, parentItem)
      overlay.api.dispose()
      overlay.overlay.remove()
    })
    this._closingSubmenuOverlays.clear()
  }

  private _restoreSubmenuItems(overlay: MenuOverlay, parentItem: HTMLElement) {
    moveMenuChildren(overlay.content, parentItem)
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _queryTriggerAnchor(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  private _getSubmenuTriggerAnchor(level: number): HTMLElement | null {
    const idx = this._activePath[level]
    if (idx === undefined) return null
    const items = this._getLevelItems(level)
    const item = items[idx]
    if (!item) return null
    return item.shadowRoot?.querySelector('.item-inner') ?? item
  }

  private _onTriggerClick = (event: MouseEvent) => {
    if (this.disabled) return
    if (this.open) {
      this._closeAll(true)
    } else {
      this._openMenu(event.detail === 0, true)
    }
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this.isOpen || this._ignoreOutsideClick) return
    if (this._isInsideShadowRoot(e)) return
    this._closeAll(true)
  }

  private _onMenuClick = (e: MouseEvent) => {
    const item = getMenuItemFromEvent(e)
    if (!item || item.hasAttribute('disabled') || !item.hasAttribute('submenu')) return

    const level = this._getFocusedLevel(item)
    if (level === undefined) return
    const itemIndex = this._getLevelItems(level).indexOf(item)
    if (itemIndex >= 0) this._toggleSubmenu(level, itemIndex, e.detail === 0)
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled || !this.open) return

    // overlay 上键盘事件 target 是菜单项而非组件自身，不能限定 e.target === this，
    // 否则鼠标打开、焦点在菜单项时 Escape 无法关闭
    if (e.key === 'Escape') {
      if (this._activePath.length > 0) this._closeSubmenuFrom(this._activePath.length)
      else this._closeAll(true)
      e.preventDefault()
      return
    }

    const focused = this._getFocusedItem(e)
    const level = this._getFocusedLevel(focused)
    if (level === undefined) return
    const items = this._getEnabledLevelItems(level)
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
          const itemIndex = this._getLevelItems(level).indexOf(focused)
          this._toggleSubmenu(level, itemIndex, true)
          requestAnimationFrame(() =>
            requestAnimationFrame(() => this._focusMenuItem(this._getEnabledLevelItems(level + 1)[0]))
          )
        }
        break
      case 'ArrowLeft':
        if (level > 0) {
          this._closeSubmenuFrom(level)
          this._focusMenuItem(this._getLevelItems(level - 1)[this._activePath[level - 1]])
        }
        break
      case 'Enter':
      case ' ':
        focused?.click()
        break
      case 'Escape':
        if (this._activePath.length > 0) this._closeSubmenuFrom(this._activePath.length)
        else this._closeAll(true)
        break
      default:
        return
    }
    e.preventDefault()
    e.stopPropagation()
  }

  private _getEnabledLevelItems(level: number) {
    const content = this._overlays.get(level)?.content
    return content ? getEnabledMenuItems(content) : []
  }

  private _getFocusedItem(event?: KeyboardEvent): HTMLElement | undefined {
    const eventItem = event
      ?.composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches('web-ui-dropdown-item'))
    if (eventItem) return eventItem

    return findFocusedMenuItem([...this._overlays.values()].map(({ overlay }) => overlay))
  }

  private _getFocusedLevel(item = this._getFocusedItem()): number | undefined {
    if (!item) return undefined
    const overlay = [...this._overlays.entries()].find(([, value]) => value.overlay.contains(item))
    return overlay?.[0]
  }

  private _focusMenuItem(item: HTMLElement | undefined) {
    focusMenuItem(item)
  }

  private _isInsideShadowRoot(e: MouseEvent): boolean {
    for (const node of e.composedPath()) {
      if (node === this || node === this.shadowRoot) return true
      if (node instanceof Node && node.getRootNode() === this.shadowRoot) return true
      if (node instanceof Node && [...this._overlays.values()].some(({ overlay }) => overlay.contains(node)))
        return true
    }
    return false
  }

  private _ignoreCurrentOutsideClick() {
    this._ignoreOutsideClick = true
    clearTimeout(this._ignoreOutsideClickTimer)
    this._ignoreOutsideClickTimer = setTimeout(() => {
      this._ignoreOutsideClick = false
    })
  }

  private _bindLevelHovers() {
    this._hoverCleanupFns.forEach(fn => fn())
    this._hoverCleanupFns.length = 0

    const maxLevel = this._activePath.length + 1
    for (let lv = 0; lv <= maxLevel; lv++) {
      const items = this._getLevelItems(lv)
      if (!items.length) continue
      items.forEach((item, idx) => {
        if (!item.matches('web-ui-dropdown-item') || item.hasAttribute('disabled')) return
        const handler = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return
          clearTimeout(this._openTimer)
          if (item.hasAttribute('submenu')) {
            if (this._activePath[lv] !== idx) {
              this._openTimer = setTimeout(() => this._toggleSubmenu(lv, idx), 200)
            }
          } else if (this._activePath.length > lv) {
            this._closeSubmenuFrom(lv + 1)
          }
        }
        item.addEventListener('pointerenter', handler, { passive: true })
        this._hoverCleanupFns.push(() => item.removeEventListener('pointerenter', handler))
      })
    }
  }

  private _bindHoversAfterUpdate() {
    requestAnimationFrame(() => this._bindLevelHovers())
  }

  override render() {
    return html`
      <div class="dropdown-trigger" @click=${this._onTriggerClick}>
        <slot name="trigger"></slot>
      </div>
    `
  }

  declare readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown': WebUiDropdown
  }
}
