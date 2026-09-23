import type { Placement } from '@floating-ui/dom'
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
import { createMenuPortalOverlay } from '@/shared/menu-portal/menu-portal'
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
  returnManagedMenuItemsToSlot,
  type MenuItemAnchors
} from '@/shared/menu-portal/menu-tree'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { defineOverlay } from '@/shared/overlay/overlay'
import type { OverlayApi } from '@/shared/overlay/overlay'
import { FLOATING_PLACEMENTS } from '@/shared/overlay/placement-props'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import style from './style.css?inline'

export type { Placement }

const SLOT_PREFIX = 'web-ui-menu-level-'
// 一级菜单项的模板位 marker（机制与 context-menu 共用，见 menu-tree 的托管项锚说明）。
const MENU_ITEM_MARKER = 'wui-dropdown-menu-item'

let dropdownIdCounter = 0

interface MenuOverlay {
  api: OverlayApi
  overlay: HTMLElement
  content: HTMLElement
  /** 该层为子菜单时的会话句柄；根层句柄由组件单独持有（见 `_handle`）。 */
  handle?: OpenOverlayHandle
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
    this._placement = normalizeLiteral(v, FLOATING_PLACEMENTS, 'bottom-start')
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
  /** 实例作用域的帧事务入口（合并了原 lifecycle）。 */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._keyboardDelegate.closeDeepestOrAll(),
    isConnected: () => this.isConnected
  })
  private readonly _scrollLock = defineScrollLockLease().make()
  /**
   * 当前 Escape 候选的会话句柄（level 0）。面板要等一帧才建好，而 Escape 可能在这之前
   * 到达：先以宿主为 panel claim 一次，面板就绪后 release 旧会话、再以真实面板重新 claim。
   * 子菜单的句柄存在各自 `MenuOverlay.handle` 上（经 adopt 进本句柄子树）。
   */
  private _handle: OpenOverlayHandle | null = null
  // 行为层（hover / outside-click / 键盘 / submenu 收尾）由 shared/menu-behavior 驱动
  private readonly _outsideClickGuard = createMenuOutsideClickGuard(
    this,
    // 根句柄的 contains 递归覆盖全部已 adopt 的子层，一次查询替代逐层判定。
    node => this._handle?.contains(node) ?? false
  )
  private readonly _closingSubmenus = createClosingSubmenuStack<MenuOverlay>({
    getPanel: container => container.overlay,
    restoreItems: (container, parentItem) => moveMenuChildren(container.content, parentItem),
    dispose: container => {
      container.handle?.release()
      container.overlay.remove()
      container.api.dispose()
    }
  })
  private readonly _hoverDelegate: MenuHoverDelegate = {
    getOpenDepth: () => this._activePath.length,
    getLevelItems: level => this._getLevelItems(level),
    getActiveItem: level => this._getLevelItems(level)[this._activePath[level]],
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenu: item => {
      const level = this._getFocusedLevel(item)
      if (level === undefined) return
      const itemIndex = this._getLevelItems(level).indexOf(item)
      if (itemIndex >= 0) this._toggleSubmenu(level, itemIndex)
    },
    closeFrom: level => this._closeSubmenuFrom(level + 1)
  }
  private readonly _hoverBinder = createMenuHoverBinder(this._hoverDelegate, 'web-ui-dropdown-item')
  private readonly _keyboardDelegate: MenuKeyboardDelegate = {
    getFocusedItem: event =>
      getFocusedMenuItemFromPanels(
        event,
        [...this._overlays.values()].map(({ overlay }) => overlay),
        'web-ui-dropdown-item'
      ),
    getLevelOf: item => this._getFocusedLevel(item),
    getEnabledItems: level => getEnabledMenuLevelItems(this._overlays.get(level)?.content),
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenuInstant: item => {
      const level = this._getFocusedLevel(item)
      if (level === undefined) return
      const itemIndex = this._getLevelItems(level).indexOf(item)
      if (itemIndex >= 0) this._toggleSubmenu(level, itemIndex, true)
    },
    closeToParent: level => {
      this._closeSubmenuFrom(level)
      return this._getLevelItems(level - 1)[this._activePath[level - 1]]
    },
    closeDeepestOrAll: () => {
      if (this._activePath.length > 0) this._closeSubmenuFrom(this._activePath.length)
      else this._closeAll(true)
    }
  }
  private readonly _userOpenChange = new UserChangeController()
  private _restoreFocusTarget?: HTMLElement
  private _shouldOpenInstantly = true
  private _menuSyncScheduled = false
  private readonly _level0ItemAnchors: MenuItemAnchors = new Map()
  // 打开期实时渲染：框架（Vue/React 条件渲染）可能在菜单打开期间持续插入菜单项。
  // 观察宿主子树（新增项可能被框架 wrapper 包裹）与各层级面板 content 的子树
  // （打开中的 submenu 父项已被迁入 content，其新增子项只在这里可见），下一帧统一
  // 把新子树迁入对应层级面板；面板尺寸变化由 defineOverlay 的 autoUpdate 跟进重定位。
  private readonly _menuContentObserver = new MutationObserver(() => {
    if (this.open) this._scheduleMenuSync()
  })

  get isOpen(): boolean {
    return this.open || this._activePath.length > 0
  }

  override connectedCallback() {
    super.connectedCallback()
    this._overlay.resume()
    this.addEventListener('keydown', this._onKeydown)
    document.addEventListener('click', this._onClickOutside)
    this._menuContentObserver.observe(this, { childList: true, subtree: true })
    /*
     * 重挂载对账：`disconnectedCallback` 会拆掉面板、把菜单项迁回宿主，但 `open` 是公开
     * prop，不因卸载而改写。Lit 在 detach 期间不记 `changedProperties`，重连后 `updated()`
     * 不再命中 `changed.has('open')`，面板于是永久缺席：宿主仍反射 `open` 与
     * `aria-expanded`，Escape 和 outside click 却无层可关。首连时 `open` 在
     * `changedProperties` 里、由 `updated()` 负责，`hasUpdated` 就是用来只认重连的。
     */
    if (this.open && this.hasUpdated) this._syncOpenOverlay(this._isFocusOrphaned())
  }

  override firstUpdated() {
    // trigger slot 内容增删不触发宿主响应式更新：显式请求一轮渲染，
    // 由 updated() 的 ARIA 回写覆盖晚到的 trigger 元素。
    this.shadowRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.addEventListener('slotchange', () => this.requestUpdate())
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._menuContentObserver.disconnect()
    this.removeEventListener('keydown', this._onKeydown)
    document.removeEventListener('click', this._onClickOutside)
    this._outsideClickGuard.dispose()
    this._hoverBinder.dispose()
    // 停止帧调度；登记由 _cleanupClosedMenu → _disposeAll 撤销。
    this._overlay.suspend()
    this._scrollLock.release()
    this._cleanupClosedMenu()
  }

  protected override updated(changed: Map<string, unknown>) {
    // ARIA 回写不依赖 open 分支，任何渲染后都保持与宿主状态同步。
    this._syncTriggerAria()

    if (changed.has('open')) {
      if (this.open) {
        this._syncOpenOverlay(true)
      } else {
        this._overlay.invalidate()
        this._syncScrollLock()
        /*
         * release ⟺ 关闭：新模块里「已登记」就等于「参与仲裁」，不再由 host.isOpen()
         * 兜底过滤，所以必须在这里撤销，不能等到退场动画结束。
         */
        this._handle?.release()
        this._handle = null
        void this._closeRootAfterPresence()
      }
      if (this._userOpenChange.consume()) {
        dispatchOpenChangeEvent(this, this.open)
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
    this._hoverBinder.bind()
  }

  /**
   * 焦点是否已无归属：被 detach 打掉的焦点会落回 `body`，用户主动点到别处时不会。
   * 重挂载对账只在前者才把焦点夺回菜单，否则等于从消费者手里抢焦点。
   */
  private _isFocusOrphaned(): boolean {
    const active = document.activeElement
    return active === null || active === document.body || active === document.documentElement
  }

  /**
   * 打开态的唯一对账入口：面板、滚动锁、outside click、hover 与菜单焦点都从这里收敛，
   * `updated()` 的打开分支与重连对账共用它，两条路径必须落到同一个状态。
   */
  private _syncOpenOverlay(takeFocus: boolean) {
    this._restoreFocusTarget ??= document.activeElement instanceof HTMLElement ? document.activeElement : undefined
    this._outsideClickGuard.arm()
    this._syncScrollLock()
    this._hideAllSubmenuChildren()
    this._overlay.invalidate()
    this._overlay.scheduleFrame(() => {
      this._ensureOverlay(0, this._shouldOpenInstantly)
      this._shouldOpenInstantly = true
      if (takeFocus) focusMenuItem(getEnabledMenuLevelItems(this._overlays.get(0)?.content)[0])
      // 面板 id 在 overlay 构建后才有：回写 aria-controls 指向。
      this._syncTriggerAria()
    })
    this._bindHoversAfterUpdate()
  }

  // 命令式打开，不派发 open-change。
  openMenu() {
    this._openMenu(true, false)
  }

  private _openMenu(isInstant: boolean, fromUser: boolean) {
    if (this.disabled || this.open) return
    this._outsideClickGuard.arm()
    this._shouldOpenInstantly = isInstant
    if (fromUser) this._userOpenChange.mark()
    // 面板要等一帧才建好，而 Escape 可能在这之前到达：先用宿主当 panel claim 一次；
    // 面板就绪后 _buildOverlay 会 release 这个占位会话，再以真实面板重新 claim。
    this._claimRoot(this._overlays.get(0)?.overlay ?? this)
    this.open = true
  }

  // 命令式关闭全部层级，不派发 open-change。
  closeAll() {
    this._closeAll(false)
  }

  private _closeAll(fromUser: boolean) {
    if (!this.open) return
    if (fromUser) this._userOpenChange.mark()
    this.open = false
  }

  // 不影响 open prop。
  private _closeAllSubmenus() {
    this._closeSubmenuFrom(1, true)
    this._closingSubmenus.restoreAll()
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
      this._overlay.scheduleFrame(() => {
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
        this._closingSubmenus.closeAsync(parentItem, overlay)
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
    if (!content) return
    // 初次打开即建立 marker 锚：宿主此后始终持有模板序骨架，打开期框架插入与
    // 关闭归还都以它为基准（机制与 context-menu 共用，见 menu-tree）。
    reconcileManagedMenuItems(this, content, this._level0ItemAnchors, MENU_ITEM_MARKER)
    orderManagedMenuItems(this, content, this._level0ItemAnchors, MENU_ITEM_MARKER)
  }

  private _scheduleMenuSync() {
    if (this._menuSyncScheduled) return
    this._menuSyncScheduled = true
    requestAnimationFrame(() => {
      this._menuSyncScheduled = false
      if (!this.open) return
      this._syncOpenMenuContent()
    })
  }

  // 打开期的统一内容同步：把打开期间框架新增的菜单子树迁入对应层级面板。
  // 一级项走 marker 锚 reconcile（保序 + 关闭按模板位归还）；面板尺寸变化由
  // defineOverlay 的 autoUpdate 跟进重定位。
  private _syncOpenMenuContent() {
    const level0Content = this._overlays.get(0)?.content
    // 迁移前隐藏宿主中新项的嵌套子项（hidden slot 属性随元素一起迁移）。
    this._hideAllSubmenuChildren()
    if (level0Content) {
      reconcileManagedMenuItems(this, level0Content, this._level0ItemAnchors, MENU_ITEM_MARKER)
      // 新迁入项的嵌套子项未打 hidden slot，会经 dropdown-item 默认 slot 渲染进
      // 父项 label 叠到菜单上；面板项在面板内渲染，宿主查询够不到，须对 content 补隐藏。
      hideNestedMenuChildren(level0Content, `${SLOT_PREFIX}-hidden`)
      // 框架注释锚点复位独立于元素重排：锚点漂移不收敛会破坏后续翻转的插入点（同 context-menu）。
      const frameworkAnchors = captureFrameworkAnchors(level0Content, MENU_ITEM_MARKER)
      orderManagedMenuItems(this, level0Content, this._level0ItemAnchors, MENU_ITEM_MARKER)
      restoreFrameworkAnchors(level0Content, frameworkAnchors)
    }
    for (const [level, overlay] of this._overlays) {
      if (level === 0) continue
      const parentItem = this._getLevelItems(level - 1)[this._activePath[level - 1]]
      if (parentItem) moveMenuChildren(parentItem, overlay.content)
      hideNestedMenuChildren(overlay.content, `${SLOT_PREFIX}-hidden`)
    }
    this._hoverBinder.bind()
  }

  private _returnLevel0Items() {
    const content = this._overlays.get(0)?.content
    if (content) returnManagedMenuItemsToSlot(this, content, this._level0ItemAnchors)
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

  /*
   * 登记与「面板是否本帧新建」解耦，与 context-menu 的根层修复同构。
   *
   * 退场被打断时（`_closeRootAfterPresence` 在 `hideOverlayPresence` 返回 false 后提前
   * return）面板仍在 DOM 里，而关闭分支已经把句柄撤了。此时重开走的是 `_ensureOverlay`
   * 的两条复用分支，它们不会重跑 `_buildOverlay`——原先只有 `_buildOverlay` 会 claim/adopt，
   * 于是出现「面板可见 + `open === true` 却没有任何登记」：Escape 关不掉它（仲裁看不到它），
   * 守卫里 `contains` 恒 false，点面板内部反被当成外部点击关掉整张菜单。
   *
   * `open` 属性路径（`updated()` 里 scheduleFrame 到 `_ensureOverlay(0)`）与 `openMenu()`
   * 都落在复用分支上，因此**所有**根 claim 都必须走这里 —— 只在 `_ensureOverlay` 里补 claim
   * 是不够的：`openMenu()` 会先把句柄建好，使那次补 claim 变成 no-op，子层照样被漏掉。
   *
   * 新 claim 即新会话，旧会话连同其全部 adopt 子树一起作废，因此**仍在场的**子层必须
   * 在这里统一重挂。来源有两个：`_overlays` 里登记的层级，以及本轮已退场、被移出
   * `_overlays` 却仍在 DOM 里的收尾栈面板 —— 只看前者会漏掉后者（见下）。
   */
  private _claimRoot(panel: HTMLElement): OpenOverlayHandle {
    this._handle?.release()
    this._handle = this._overlay.claim(panel)
    for (const [level, sub] of this._overlays) {
      if (level === 0) continue
      sub.handle = this._handle.adopt(sub.overlay)
    }
    /*
     * 收尾栈里的子菜单面板同样「可见但已脱离快照」：`_closeSubmenuFrom` 只把它们移出
     * `_overlays`，层仍挂在旧句柄下、面板仍在 DOM 里退场。不重挂的话它们会被判成面板外，
     * 点它内部就关掉整张菜单 —— base 的 `composition.contains` 走登记树、且退场期间不注销，
     * 所以这条是相对 base 的行为回归，不是 parity。
     * 新句柄要写回容器：收尾结束时 adapter.dispose 释放的是 `container.handle`。
     */
    for (const container of this._closingSubmenus.closing()) {
      container.handle = this._handle.adopt(container.overlay)
    }
    return this._handle
  }

  /** 句柄缺失时补登记；面板还没建好时以宿主代填，与 `_openMenu` 的占位会话同一口径。 */
  private _ensureRootHandle(): OpenOverlayHandle {
    return this._handle ?? this._claimRoot(this._overlays.get(0)?.overlay ?? this)
  }

  private _ensureOverlay(level: number, isInstant = false, submenuItem?: HTMLElement): boolean {
    const closingOverlay = submenuItem ? this._closingSubmenus.take(submenuItem) : undefined
    if (closingOverlay) {
      // 从 closing 栈取回的面板：登记已在关闭时撤销，这里必须重新挂回根句柄子树。
      closingOverlay.handle = this._ensureRootHandle().adopt(closingOverlay.overlay)
      this._overlays.set(level, closingOverlay)
      closingOverlay.api.open()
      showOverlayPresence(closingOverlay.overlay, { isInstant })
      return true
    }
    const existing = this._overlays.get(level)
    if (existing) {
      this._ensureRootHandle()
      existing.api.open()
      showOverlayPresence(existing.overlay, { isInstant })
      return false
    }
    this._buildOverlay(level, isInstant)
    return false
  }

  private _buildOverlay(level: number, isInstant = false) {
    const { panel: overlay, content } = createMenuPortalOverlay('dropdown-overlay', this)
    overlay.setAttribute('role', 'menu')
    // 根层级面板带 id：trigger 的 aria-controls 指向它（Q9a）。
    if (level === 0) overlay.id = `wui-dropdown-menu-${++dropdownIdCounter}`
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
        // 菜单至少与 trigger/父项同宽，内容可更宽（floor 来自 --wui-overlay-min-width）
        minAnchorWidth: true,
        matchWidth: level === 0 ? this.matchWidth : false,
        strategy: 'fixed'
      })
      if (level === 0) {
        // 面板就绪：释放「以宿主代填」的占位会话，换成真实面板。
        this._claimRoot(overlay)
        this._overlays.set(level, { api: ctrl, overlay, content })
        this._populateLevel0()
      } else {
        /*
         * 子层进根句柄子树，默认不是独立候选 —— 「在树里但不是这一层」由此表达；
         * 原先按 level 找父面板的判断随之消失。用 `_ensureRootHandle()` 而不是 `_handle?.`：
         * 后者在句柄意外缺失时会静默跳过 adopt，留下一棵无人认领的子树。
         */
        const handle = this._ensureRootHandle().adopt(overlay)
        this._overlays.set(level, { api: ctrl, overlay, content, handle })
      }
      // submenu 父项在面板 content 内，其新增子项只有观察 content 子树才能看到
      this._menuContentObserver.observe(content, { childList: true, subtree: true })
      ctrl.open()
      showOverlayPresence(overlay, { isInstant })
    }
  }

  private _disposeOverlay(level: number) {
    const overlay = this._overlays.get(level)
    if (level === 0) {
      // 根句柄撤销会递归撤销全部已 adopt 的子层。
      this._handle?.release()
      this._handle = null
    }
    // 子层句柄随所属 MenuOverlay 释放；已被根层递归撤销时幂等无操作。
    overlay?.handle?.release()
    overlay?.overlay.removeEventListener('click', this._onMenuClick)
    overlay?.overlay.removeEventListener('keydown', this._onKeydown)
    overlay?.overlay.remove()
    overlay?.api.dispose()
    this._overlays.delete(level)
    this._rebindMenuContentObservers()
  }

  // jsdom 的 MutationObserver 不实现 unobserve；统一 disconnect 后重绑剩余目标。
  private _rebindMenuContentObservers() {
    this._menuContentObserver.disconnect()
    this._menuContentObserver.observe(this, { childList: true, subtree: true })
    for (const overlay of this._overlays.values()) {
      this._menuContentObserver.observe(overlay.content, { childList: true, subtree: true })
    }
  }

  private _disposeAll() {
    /*
     * 先无条件撤销根句柄。`_openMenu` 会先用宿主当 panel claim 一次占位会话（真实面板要等
     * 一帧才建好），若这段时间内宿主被卸载、`_buildOverlay` 没机会跑，`_overlays` 仍是空的
     * —— 只遍历 `_overlays` 就会漏掉它：该层永久留在模块注册表里强引用整个组件，且宿主
     * 重挂载后 `panel.isConnected` 又为真，占位层重新成为候选、吞掉 Escape。
     */
    this._handle?.release()
    this._handle = null
    for (const level of this._overlays.keys()) {
      this._disposeOverlay(level)
    }
  }

  private _syncScrollLock(isOpen = this.open) {
    this._scrollLock.sync(isOpen && !this.noScrollLock)
  }

  private _queryTriggerAnchor(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  /*
   * trigger 语义回写（Q9a）：slot 进来的元素是真正的可聚焦交互元素，
   * aria-haspopup / aria-expanded / aria-controls 必须设在它身上；
   * 组件没有 trigger 包装 div，此前完全没有 ARIA 接线。
   */
  private _syncTriggerAria() {
    const trigger = this._queryTriggerAnchor()
    if (!trigger) return
    trigger.setAttribute('aria-haspopup', 'menu')
    trigger.setAttribute('aria-expanded', String(this.open))
    const rootOverlay = this._overlays.get(0)?.overlay
    if (rootOverlay?.id) trigger.setAttribute('aria-controls', rootOverlay.id)
    else trigger.removeAttribute('aria-controls')
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
    if (!this.isOpen || this._outsideClickGuard.isArmed()) return
    if (this._outsideClickGuard.isInside(e)) return
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
    handleMenuKeyboard(this._keyboardDelegate, e)
  }

  private _getFocusedLevel(item?: HTMLElement): number | undefined {
    if (!item) return undefined
    const overlay = [...this._overlays.entries()].find(([, value]) => value.overlay.contains(item))
    return overlay?.[0]
  }

  private _bindHoversAfterUpdate() {
    requestAnimationFrame(() => this._hoverBinder.bind())
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
