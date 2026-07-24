import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { createMenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { lockScroll, unlockScroll } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

export type { Placement }

const SLOT_PREFIX = 'web-ui-menu-level-'

interface MenuOverlay {
  api: OverlayApi
  overlay: HTMLElement
}

@customElement('web-ui-dropdown-menu')
export class WebUiDropdownMenu extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: Boolean, reflect: true }) open = false
  @property({ type: String, reflect: true }) placement: Placement = 'bottom-start'
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Number }) offset = 4
  @property({ type: Boolean, reflect: true }) matchWidth = false

  @state() private _activePath: number[] = []

  private readonly _overlays = new Map<number, MenuOverlay>()
  private _openTimer?: ReturnType<typeof setTimeout>
  private _ignoreOutsideClick = false
  private _ignoreOutsideClickTimer?: ReturnType<typeof setTimeout>
  private _hoverCleanupFns: (() => void)[] = []

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
    this._cleanupClosedMenu()
    this._hoverCleanupFns.forEach(fn => fn())
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('open')) {
      if (this.open) {
        this._ignoreCurrentOutsideClick()
        lockScroll()
        this._hideAllSubmenuChildren()
        requestAnimationFrame(() => {
          if (this.open) this._ensureOverlay(0)
        })
        this._bindHoversAfterUpdate()
      } else {
        unlockScroll()
        // `_closeAllSubmenus()` resets Lit state. Run cleanup after this update
        // to avoid scheduling a second update from within `updated()`.
        queueMicrotask(() => {
          if (this.open || !this.isConnected) return
          this._cleanupClosedMenu()
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
    this._bindLevelHovers()
  }

  /* ========== 状态管理 ========== */

  /** 打开菜单（内部调用，触发 open-change 事件） */
  openMenu() {
    if (this.disabled || this.open) return
    this._ignoreCurrentOutsideClick()
    this.open = true
  }

  /** 关闭所有层级（内部调用，触发 open-change 事件） */
  closeAll() {
    if (!this.open) return
    this.open = false
  }

  /** @internal 仅清理子菜单状态（不影响 open prop） */
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

  /* ========== Slot 管理 ========== */

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

  /* ========== Overlay ========== */

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
        matchWidth: level === 0 ? this.matchWidth : false
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
    for (const level of [...this._overlays.keys()]) {
      this._disposeOverlay(level)
    }
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

  /* ========== 交互事件 ========== */

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
    if (this.disabled) return
    if (e.key === 'Escape') {
      if (this._activePath.length > 0) {
        this._closeSubmenuFrom(this._activePath.length)
      } else if (this.open) {
        this.closeAll()
      }
      e.preventDefault()
    }
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
        const handler = () => {
          clearTimeout(this._openTimer)
          if (item.hasAttribute('submenu')) {
            if (this._activePath[lv] !== idx) {
              this._openTimer = setTimeout(() => this._toggleSubmenu(lv, idx), 200)
            }
          } else if (this._activePath.length > lv) {
            this._closeSubmenuFrom(lv + 1)
          }
        }
        item.addEventListener('mouseenter', handler, { passive: true })
        this._hoverCleanupFns.push(() => item.removeEventListener('mouseenter', handler))
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
}

export interface WebUiDropdownMenu {
  readonly $events: {
    'open-change': CustomEvent<{ open: boolean }>
  }
  open: boolean
  isOpen: boolean
  openMenu(): void
  closeAll(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-menu': WebUiDropdownMenu
  }
}
