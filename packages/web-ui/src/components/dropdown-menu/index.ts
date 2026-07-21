import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import glass from '@/assets/glass.css?inline'
import { withOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'

import style from './style.css?inline'

export type { Placement }

const SLOT_PREFIX = 'web-ui-menu-level-'

@customElement('web-ui-dropdown-menu')
export class WebUiDropdownMenu extends LitElement {
  static override styles = [unsafeCSS(glass), unsafeCSS(style)]

  @property({ type: String, reflect: true }) placement: Placement = 'bottom-start'
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Number }) offset = 4
  @property({ type: Boolean, reflect: true }) matchWidth = false

  /** 根菜单是否打开 */
  @state() private _isOpen = false
  /** 子菜单路径，每层存 item 索引 */
  private _activePath: number[] = []

  private readonly _overlays = new Map<number, OverlayApi>()
  private _openTimer?: ReturnType<typeof setTimeout>
  private _cleanupFns: (() => void)[] = []

  get isOpen(): boolean {
    return this._isOpen || this._activePath.length > 0
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
    this._disposeAll()
    this._cleanupFns.forEach(fn => fn())
  }

  /* ========== 状态管理 ========== */

  open() {
    if (this.disabled || this._isOpen) return
    this._isOpen = true
    this._assignLevel0Slot()
    requestAnimationFrame(() => this._ensureOverlay(0))
    this._bindHoversAfterUpdate()
  }

  closeAll() {
    this._isOpen = false
    for (let lv = this._activePath.length; lv >= 1; lv--) {
      this._depopulateOverlay(lv)
      this._disposeOverlay(lv)
    }
    this._activePath = []
    this._syncActiveAttrs()
    this._disposeOverlay(0)
  }

  private _assignLevel0Slot() {
    // 先隐藏所有 submenu 子项
    this._hideAllSubmenuChildren()

    Array.from(this.children).forEach(child => {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        ;(child as HTMLElement).setAttribute('slot', `${SLOT_PREFIX}0`)
      }
    })
  }

  /** 隐藏所有 submenu item 的子项（防止显示在父菜单中） */
  private _hideAllSubmenuChildren() {
    this.querySelectorAll('web-ui-dropdown-item[submenu]').forEach(item => {
      Array.from(item.children).forEach(child => {
        if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
          ;(child as HTMLElement).setAttribute('slot', `${SLOT_PREFIX}-hidden`)
        }
      })
    })
  }

  /** 切换子菜单：hover 到有 children 的 item 时调用 */
  private _toggleSubmenu(level: number, itemIndex: number) {
    // 同一 item 再 hover → 保持不变，不做 toggle
    if (this._activePath[level] === itemIndex) {
      return
    }

    // 先关闭同层及更深的子层
    this._closeSubmenuFrom(level + 1)

    // 更新路径
    this._activePath[level] = itemIndex
    this._syncActiveAttrs()

    // 打开该层的子层
    const item = this._getLevelItems(level)[itemIndex]
    if (item?.hasAttribute('submenu')) {
      requestAnimationFrame(() => {
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

  /** 同步 active 属性到当前路径上的 submenu trigger item */
  private _syncActiveAttrs() {
    // 清除所有 light DOM 中的 active（含 hidden slot 的子项）
    this.querySelectorAll('web-ui-dropdown-item').forEach(item => {
      item.removeAttribute('active')
    })
    // 清除所有 overlay 中的 active
    this.shadowRoot?.querySelectorAll('.dropdown-overlay web-ui-dropdown-item').forEach(item => {
      item.removeAttribute('active')
    })
    // 设置当前路径上的 item
    for (let lv = 0; lv < this._activePath.length; lv++) {
      const items = this._getLevelItems(lv)
      const item = items[this._activePath[lv]]
      if (item?.matches('web-ui-dropdown-item')) {
        item.setAttribute('active', '')
      }
    }
  }

  /** 获取某层所有 item */
  private _getLevelItems(level: number): HTMLElement[] {
    if (level === 0) {
      return Array.from(this.children).filter((c): c is HTMLElement =>
        c.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')
      )
    }
    const scroll = this.shadowRoot?.querySelector(`.dropdown-overlay[data-level="${level}"] .dropdown-scroll`)
    if (!scroll) return []
    return Array.from(scroll.children).filter((c): c is HTMLElement =>
      c.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')
    )
  }

  /* ========== Slot 管理 ========== */

  /** 将子菜单 item 的子项移入 overlay */
  private _populateOverlay(level: number, submenuItem: HTMLElement) {
    const overlay = this.shadowRoot?.querySelector(`.dropdown-overlay[data-level="${level}"] .dropdown-scroll`)
    if (!overlay) return
    for (const child of Array.from(submenuItem.children)) {
      if (child.matches('web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header')) {
        overlay.appendChild(child)
      }
    }
  }

  /** 关闭子菜单时将子项移回 submenu item */
  private _depopulateOverlay(level: number) {
    const scroll = this.shadowRoot?.querySelector(`.dropdown-overlay[data-level="${level}"] .dropdown-scroll`)
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
    const overlay = document.createElement('div')
    overlay.className = 'dropdown-overlay wui-glass wui-glass-no-after'
    overlay.setAttribute('role', 'menu')
    overlay.dataset.level = String(level)

    const scroll = document.createElement('div')
    scroll.className = 'dropdown-scroll'

    // level 0 用 slot 投影 light DOM 子元素；level 1+ 用 appendChild 直接移入
    if (level === 0) {
      const slot = document.createElement('slot')
      slot.setAttribute('name', `${SLOT_PREFIX}0`)
      scroll.appendChild(slot)
    }

    overlay.appendChild(scroll)
    this.shadowRoot!.appendChild(overlay)

    // 计算 anchor
    const anchor = level === 0 ? this._queryTriggerAnchor() : this._getSubmenuTriggerAnchor(level - 1)

    if (anchor) {
      const ctrl = withOverlay.make({
        anchor,
        overlay,
        placement: level === 0 ? this.placement : 'right-start',
        offset: level === 0 ? this.offset : 0,
        matchWidth: level === 0 ? this.matchWidth : false
      })
      this._overlays.set(level, ctrl)
      ctrl.open()
    }
  }

  private _disposeOverlay(level: number) {
    const overlay = this.shadowRoot?.querySelector(`.dropdown-overlay[data-level="${level}"]`)
    overlay?.remove()
    this._overlays.get(level)?.dispose()
    this._overlays.delete(level)
  }

  private _disposeAll() {
    for (const lv of this._overlays.keys()) {
      this._disposeOverlay(lv)
    }
  }

  private _queryTriggerAnchor(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    return (slot?.assignedElements()[0] as HTMLElement) ?? null
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
    if (this._isOpen) {
      this.closeAll()
    } else {
      this.open()
    }
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (this.isOpen && !this.contains(e.target as Node)) {
      this.closeAll()
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled) return
    if (e.key === 'Escape') {
      if (this._activePath.length > 0) {
        this._closeSubmenuFrom(this._activePath.length)
      } else if (this._isOpen) {
        this.closeAll()
      }
      e.preventDefault()
    }
  }

  /** 绑定各层 hover 事件 */
  private _bindLevelHovers() {
    this._cleanupFns.forEach(fn => fn())
    this._cleanupFns.length = 0

    // level 0 始终绑定（根菜单打开时）
    const maxLevel = this._activePath.length + 1 // 当前层 + 可能的下一层
    for (let lv = 0; lv <= maxLevel; lv++) {
      const items = this._getLevelItems(lv)
      if (!items.length) continue
      items.forEach((item, idx) => {
        if (!item.matches('web-ui-dropdown-item') || item.hasAttribute('disabled')) return
        const handler = () => {
          clearTimeout(this._openTimer)
          if (item.hasAttribute('submenu')) {
            // 已激活的 submenu 不重复 toggle，由非 submenu 项的 hover 或 click 关闭
            if (this._activePath[lv] !== idx) {
              this._openTimer = setTimeout(() => this._toggleSubmenu(lv, idx), 200)
            }
          } else if (this._activePath.length > lv) {
            this._closeSubmenuFrom(lv + 1)
          }
        }
        item.addEventListener('mouseenter', handler, { passive: true })
        this._cleanupFns.push(() => item.removeEventListener('mouseenter', handler))
      })
    }
  }

  private _bindHoversAfterUpdate() {
    requestAnimationFrame(() => this._bindLevelHovers())
  }

  protected override updated(changed: Map<string, unknown>) {
    if (this._isOpen && !this._overlays.has(0)) {
      this._ensureOverlay(0)
    }
    this._bindLevelHovers()
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
  readonly $events: Record<string, never>
  isOpen: boolean
  open(): void
  closeAll(): void
}

declare global {
  interface HTMLElementTagNameMap {
    'web-ui-dropdown-menu': WebUiDropdownMenu
  }
}
