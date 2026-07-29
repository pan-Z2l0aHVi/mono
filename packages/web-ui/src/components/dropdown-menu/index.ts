import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { createMenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { booleanWithFalseString } from '@/shared/property-converters/boolean-with-false-string'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

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
}

@customElement('web-ui-dropdown-menu')
export class WebUiDropdownMenu extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true }) matchWidth = false
  @property({ reflect: true, attribute: 'lock-scroll', converter: booleanWithFalseString }) lockScroll = true

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
  private _openTimer?: ReturnType<typeof setTimeout>
  private _ignoreOutsideClick = false
  private _ignoreOutsideClickTimer?: ReturnType<typeof setTimeout>
  private _hoverCleanupFns: (() => void)[] = []
  private _hasScrollLock = false
  private _restoreFocusTarget?: HTMLElement

  get isOpen(): boolean {
    return this.open || this._activePath.length > 0
  }

  override connectedCallback() {
    super.connectedCallback()
    document.addEventListener('keydown', this._onKeydown)
    document.addEventListener('click', this._onClickOutside)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    document.removeEventListener('keydown', this._onKeydown)
    document.removeEventListener('click', this._onClickOutside)
    clearTimeout(this._openTimer)
    clearTimeout(this._ignoreOutsideClickTimer)
    this._syncScrollLock(false)
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
          this._ensureOverlay(0)
          this._focusMenuItem(this._getEnabledLevelItems(0)[0])
        })
        this._bindHoversAfterUpdate()
      } else {
        this._syncScrollLock()
        queueMicrotask(() => {
          if (this.open || !this.isConnected) return
          this._cleanupClosedMenu()
          this._restoreFocusTarget?.focus()
          this._restoreFocusTarget = undefined
        })
      }
      this.dispatchEvent(
        new CustomEvent('open-change', {
          detail: { open: this.open },
          bubbles: true,
          composed: true
        })
      )
    }
    if (changed.has('lockScroll')) this._syncScrollLock()
    this._bindLevelHovers()
  }

  /** 打开菜单 */
  openMenu() {
    if (this.disabled || this.open) return
    this._ignoreCurrentOutsideClick()
    this.open = true
  }

  /** 关闭所有层级 */
  closeAll() {
    if (!this.open) return
    this.open = false
  }

  /** 清理子菜单状态（不影响 open prop） */
  private _closeAllSubmenus() {
    if (this._activePath.length === 0) return
    for (let lv = this._activePath.length; lv >= 1; lv--) {
      this._depopulateOverlay(lv)
      this._disposeOverlay(lv)
    }
    this._activePath = []
    this._syncActiveAttrs()
  }

  private _cleanupClosedMenu() {
    this._closeAllSubmenus()
    this._returnLevel0Items()
    this._disposeAll()
  }

  private _hideAllSubmenuChildren() {
    this.querySelectorAll('web-ui-dropdown-item[submenu]').forEach(item => {
      Array.from(item.children).forEach(child => {
        if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
          child.setAttribute('slot', `${SLOT_PREFIX}-hidden`)
        }
      })
    })
  }

  private _toggleSubmenu(level: number, itemIndex: number) {
    if (this._activePath[level] === itemIndex) {
      return
    }

    this._closeSubmenuFrom(level + 1)

    this._activePath[level] = itemIndex
    this._syncActiveAttrs()

    const item = this._getLevelItems(level)[itemIndex]
    if (item?.hasAttribute('submenu')) {
      requestAnimationFrame(() => {
        if (!this.open || this._activePath[level] !== itemIndex) return
        this._ensureOverlay(level + 1)
        this._populateOverlay(level + 1, item)
      })
    }

    this._bindHoversAfterUpdate()
  }

  private _closeSubmenuFrom(level: number) {
    for (let lv = this._activePath.length; lv >= level; lv--) {
      this._depopulateOverlay(lv)
      this._disposeOverlay(lv)
    }
    this._activePath = this._activePath.slice(0, level - 1)
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
    const scroll = this._overlays.get(level)?.overlay.querySelector<HTMLElement>('.dropdown-scroll')
    if (!scroll) return []
    return Array.from(scroll.children).filter((c): c is HTMLElement =>
      c.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')
    )
  }

  private _populateLevel0() {
    const overlay = this._overlays.get(0)?.overlay.querySelector<HTMLElement>('.dropdown-scroll')
    if (!overlay) return
    Array.from(this.children).forEach(child => {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        overlay.appendChild(child)
      }
    })
  }

  private _returnLevel0Items() {
    const overlay = this._overlays.get(0)?.overlay.querySelector<HTMLElement>('.dropdown-scroll')
    if (!overlay) return
    Array.from(overlay.children).forEach(child => {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        this.appendChild(child)
      }
    })
  }

  private _populateOverlay(level: number, submenuItem: HTMLElement) {
    const overlay = this._overlays.get(level)?.overlay.querySelector<HTMLElement>('.dropdown-scroll')
    if (!overlay) return
    for (const child of Array.from(submenuItem.children)) {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        overlay.appendChild(child)
      }
    }
  }

  private _depopulateOverlay(level: number) {
    const scroll = this._overlays.get(level)?.overlay.querySelector<HTMLElement>('.dropdown-scroll')
    if (!scroll) return
    for (const child of Array.from(scroll.children)) {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        const targetLevel = level - 1
        const items = this._getLevelItems(targetLevel)
        const submenuItem = items[this._activePath[targetLevel]]
        if (submenuItem) {
          submenuItem.appendChild(child)
        }
      }
    }
  }

  private _ensureOverlay(level: number) {
    if (this._overlays.has(level)) return
    this._buildOverlay(level)
  }

  private _buildOverlay(level: number) {
    const overlay = createMenuPortalOverlay('dropdown-overlay')
    overlay.setAttribute('role', 'menu')
    overlay.dataset.level = String(level)

    const scroll = document.createElement('div')
    scroll.className = 'dropdown-scroll'
    overlay.appendChild(scroll)

    const anchor = level === 0 ? this._queryTriggerAnchor() : this._getSubmenuTriggerAnchor(level - 1)

    if (anchor) {
      const ctrl = withOverlay.make({
        anchor,
        overlay,
        placement: level === 0 ? this.placement : 'right-start',
        offset: level === 0 ? this.offset : 0,
        matchWidth: level === 0 ? this.matchWidth : false,
        strategy: 'fixed'
      })
      this._overlays.set(level, { api: ctrl, overlay })
      if (level === 0) this._populateLevel0()
      ctrl.open()
    }
  }

  private _disposeOverlay(level: number) {
    const overlay = this._overlays.get(level)?.overlay
    overlay?.remove()
    this._overlays.get(level)?.api.dispose()
    this._overlays.delete(level)
  }

  private _disposeAll() {
    for (const level of this._overlays.keys()) {
      this._disposeOverlay(level)
    }
  }

  private _syncScrollLock(isOpen = this.open) {
    const shouldLock = isOpen && this.lockScroll
    if (shouldLock === this._hasScrollLock) return

    if (shouldLock) lockScroll()
    else unlockScroll()
    this._hasScrollLock = shouldLock
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

  private _onTriggerClick = () => {
    if (this.disabled) return
    if (this.open) {
      this.closeAll()
    } else {
      this.openMenu()
    }
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (!this.isOpen || this._ignoreOutsideClick) return
    if (this._isInsideShadowRoot(e)) return
    this.closeAll()
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled || !this.open) return

    if (e.key === 'Escape' && e.target === this) {
      if (this._activePath.length > 0) this._closeSubmenuFrom(this._activePath.length)
      else this.closeAll()
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
          const itemIndex = this._getLevelItems(level).indexOf(focused)
          this._toggleSubmenu(level, itemIndex)
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
        else this.closeAll()
        break
      default:
        return
    }
    e.preventDefault()
  }

  private _getEnabledLevelItems(level: number) {
    return this._getLevelItems(level).filter(item => item.matches('web-ui-dropdown-item:not([disabled])'))
  }

  private _getFocusedItem(): HTMLElement | undefined {
    return [...this._overlays.values()]
      .flatMap(({ overlay }) => Array.from(overlay.querySelectorAll<HTMLElement>('web-ui-dropdown-item')))
      .find(item => Boolean(item.shadowRoot?.activeElement))
  }

  private _getFocusedLevel(): number | undefined {
    const item = this._getFocusedItem()
    if (!item) return undefined
    const overlay = [...this._overlays.entries()].find(([, value]) => value.overlay.contains(item))
    return overlay?.[0]
  }

  private _focusMenuItem(item: HTMLElement | undefined) {
    if (!item || item.hasAttribute('disabled')) return
    const focusable = item as HTMLElement & { focusItem?: () => void }
    focusable.focusItem?.()
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
    'web-ui-dropdown-menu': WebUiDropdownMenu
  }
}
