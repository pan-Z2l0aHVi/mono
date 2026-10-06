import { computePosition, flip, shift } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

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
  findFocusedMenuItem,
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
import { normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { defineOverlayPositioningGeneration } from '@/shared/overlay/positioning-generation'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import scrimStyle from './scrim.css?inline'
import style from './style.css?inline'

const MARKER_TEXT = 'wui-context-menu-item'

/** 与 iOS / Android 原生长按一致的默认时长。 */
const DEFAULT_LONG_PRESS_DELAY = 500
/** long-press-delay 的上界：超过 5s 的长按不再是「长按」，等同没有该属性。 */
const MAX_LONG_PRESS_DELAY = 5000
/** 按住期间的容差位移；超出即视为滚动/拖拽意图，取消长按。 */
const LONG_PRESS_MOVE_TOLERANCE = 10
/**
 * 长按开菜单后吸收浏览器补发事件的窗口上限。
 *
 * 这不是时序保证：实测补发几乎紧跟抬手（touchend(1019ms) → click(1022ms)，间隔 3ms），
 * 1000ms 远大于实际需要，只是一个陈旧兜底上限。真正的边界是下一次 `pointerdown`
 * （`_onPointerDown` 无条件清零，含鼠标）与菜单关闭，两条硬边界都在窗口判定之外，
 * 所以窗口只负责兜住「补发事件既没等到下一次按下、菜单也没关闭」这种不该发生的路径。
 */
const LONG_PRESS_FOLLOW_UP_WINDOW_MS = 1000

/**
 * 菜单打开期间铺在整屏上的 scrim `<dialog>`。
 *
 * 用 `<dialog>` + `showModal()` 而不是 plain `div`：模态 dialog 进 top layer，
 * 于是「z-index 谁高谁低」这道约束整体消失 —— 面板与 scrim 同在 top layer，
 * 而 top layer 之下的任何 z-index 都碰不到它们。plain `div` 也能修好 light-dismiss
 * 穿透，但那样 scrim 必须靠 z-index 压过 `--wui-layer-menu`(100)，是另一套易碎的约定。
 */
const SCRIM_ATTR = 'data-wui-menu-scrim'

type CloseSource = 'menu-item' | 'default'

/** 首项聚焦的最大尝试次数（含首次）。见 `_focusFirstItem`。 */
const FOCUS_FIRST_ITEM_ATTEMPTS = 5

/** 面板与视口边缘的最小间距，与既有夹取算术同源。 */
const VIEWPORT_PADDING = 8

@customElement('web-ui-context-menu')
export class WebUiContextMenu extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  /** opt-in：触屏长按打开菜单。默认关闭，鼠标路径靠原生 contextmenu，无需此属性。 */
  @property({ type: Boolean, reflect: true, attribute: 'long-press' }) longPress = false

  private _longPressDelay = DEFAULT_LONG_PRESS_DELAY

  /**
   * 走包内既有的 `normalizeNumber` 通道（与 `dropdown.offset`、`popover.offset` 同形）。
   * 不能只靠 `Math.max(0, …)` 挡负数：`Math.max(0, NaN) === NaN`，而属性写错
   * （`long-press-delay="abc"`）时 Lit 的 Number converter 给的正是 NaN，
   * `setTimeout(fn, NaN)` 会立刻触发，长按就在 pointerdown 同一帧开菜单、绕过全部时长语义。
   */
  @property({ type: Number, attribute: 'long-press-delay' })
  get longPressDelay(): number {
    return this._longPressDelay
  }
  set longPressDelay(v: number) {
    const old = this._longPressDelay
    this._longPressDelay = normalizeNumber(v, 0, MAX_LONG_PRESS_DELAY, DEFAULT_LONG_PRESS_DELAY)
    this.requestUpdate('longPressDelay', old)
  }

  @state() private _isOpen = false
  @state() private _x = 0
  @state() private _y = 0

  private _activeSubmenus: MenuPortalOverlay[] = []
  private _activeSubmenuItems: HTMLElement[] = []
  private _longPressTimer: ReturnType<typeof setTimeout> | undefined
  private _longPressOrigin: { x: number; y: number } | undefined
  /**
   * 长按自行开菜单的时刻。浏览器会为**同一次触摸**补发两个事件，二者都属于
   * 那一次意图，不是两次独立操作：
   *
   * - 原生 `contextmenu`：长按被识别时立刻派发，会重复打开（`_openAt` 走已开分支）。
   * - 合成 `click`：`touchend` 之后由引擎补发，会把刚打开的菜单立刻 light-dismiss。
   *   实测真实触控管线下的顺序为 pointerdown(9ms) → 长按开菜单(≈509ms) →
   *   touchend(1019ms) → click(1022ms)，缺这一步菜单开了就被自己的补发事件关掉。
   *
   * 因此在窗口内吸收这两个补发事件；窗口由下一次 `pointerdown` 关闭。
   */
  private _longPressOpenedAt: number | null = null
  // 子菜单 dialog 定位的唯一写者代数（按 panel 键控）：同帧关闭→重开复用同一 panel
  // 时只允许最新一次定位写入；不同层级子菜单各有 panel，互不作废。
  private readonly _submenuPositionEpochs = new WeakMap<HTMLElement, number>()
  private _menu?: MenuPortalOverlay
  /**
   * 模态 scrim。菜单打开期间存在并处于 `showModal()` 状态，关闭时随面板一起移除。
   *
   * 面板必须**显式**挂进它（`createMenuPortalOverlay` 的第三参）：`resolveOverlayContainer`
   * 查的是 target 的**祖先**里有无已打开的 dialog，而 scrim 是面板的反方向，祖先发现查不到。
   */
  private _scrim?: HTMLDialogElement
  /**
   * 本次开启是否**水平居中于触发点**（触屏长按路径）。鼠标 / 键盘路径仍左上角对齐光标。
   *
   * 只切换 placement 的对齐量，不切换定位算法 —— 两条入口共用 `_positionMenu` 里的
   * 同一套 `computePosition` + `flip` / `shift`，垂直契约（上缘对齐触发点、向下展开、
   * 放不下翻到上方）完全一致。
   *
   * 触屏要居中：手指按下去的位置是「这块内容在这里」的意思，菜单在它正下方居中展开，
   * 正是 iOS / Android 原生长按菜单的形态；左对齐会让菜单整体偏到手指右侧，看起来像
   * 弹在了别的东西上面。
   *
   * 鼠标不居中：桌面右键的肌肉记忆是菜单**左上角**出现在光标处。更要紧的是居中会让光标
   * 落在面板上缘正中 —— 也就是落在第一项的命中区里。后果是菜单一开就有项处于 hover 高亮，
   * 并且紧接着再右键一次（想开子菜单）会打在菜单项上而不是空白处。`overlay-in-dialog`
   * 里 `openAt(100, 400)` 那条用例钉的 `'top left'` 正是这条契约。
   *
   * 判据是**开启来源**（调用点显式传入），不靠运行时嗅探 pointerType 或视口宽度：
   * 后两者会让同一块屏幕上的两种输入拿到两套布局，且与本组件 opt-in 的 `long-press`
   * 属性不同源。
   */
  private _centerOnPressPoint = false

  /**
   * 本次关闭的来源，决定焦点归还走哪条路。语义见 `close()` 里的说明。
   *
   * 只有菜单项激活这一条需要抢在退场之前出顶层；点外面 / Escape / 程序式关闭一律
   * 保留 dialog 默认效果 —— 那正是用户「回到原处」的期望。
   */
  private _closeSource: CloseSource = 'default'
  /** 根面板的开启会话句柄；未开启时为 null。查询走它。 */
  private _menuHandle: OpenOverlayHandle | null = null
  /**
   * 子菜单 panel → 会话句柄。子层经 `adopt` 进根句柄子树（默认不成为独立候选），
   * 但仍各自持有句柄：整层关闭或收尾动画结束时按 panel 精确撤销。
   */
  private readonly _submenuHandles = new Map<HTMLElement, OpenOverlayHandle>()
  // 行为层（hover / outside-click / 键盘 / submenu 收尾）由 shared/menu-behavior 驱动
  private readonly _outsideClickGuard = createMenuOutsideClickGuard(
    this,
    // 根句柄的 contains 递归覆盖全部已 adopt 的子层，一次查询替代逐 panel 判定。
    node => this._menuHandle?.contains(node) ?? false
  )
  private readonly _closingSubmenus = createClosingSubmenuStack<MenuPortalOverlay>({
    getPanel: container => container.panel,
    restoreItems: (container, parentItem) => this._restoreSubmenuItems(container, parentItem),
    dispose: container => {
      this._releaseSubmenu(container.panel)
      container.panel.remove()
    }
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
  /*
   * 开启态浮层（issue #120 Block 1）。根面板是登记对象：子菜单经 adopt 成为它的逻辑
   * 后代；关闭动作仍走 closeDeepestOrAll（最深子菜单优先）。
   */
  private readonly _overlay = defineOpenOverlay().make({
    requestClose: () => this._keyboardDelegate.closeDeepestOrAll(),
    isConnected: () => this.isConnected
  })
  private readonly _menuItemAnchors = new Map<HTMLElement, Comment>()
  private readonly _scrollLock = defineScrollLockLease().make()
  private readonly _userOpenChange = new UserChangeController()
  private _shouldOpenInstantly = true
  private _suppressInitialFocusVisible = true
  private _refreshScheduled = false
  // 主菜单 dialog 路径与子菜单一样使用代数令牌；快速 openAt/refresh 或 close 后，
  // 迟到的 positioning promise 只能被丢弃，不能覆盖最新坐标。
  private readonly _menuPositionGeneration = defineOverlayPositioningGeneration().make()
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
    this.addEventListener('pointerdown', this._onPointerDown)
    this.addEventListener('pointermove', this._onPointerMove)
    this.addEventListener('pointerup', this._onPointerUp)
    this.addEventListener('pointercancel', this._onPointerCancel)
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
    this.removeEventListener('pointerdown', this._onPointerDown)
    this.removeEventListener('pointermove', this._onPointerMove)
    this.removeEventListener('pointerup', this._onPointerUp)
    this.removeEventListener('pointercancel', this._onPointerCancel)
    document.removeEventListener('contextmenu', this._onContextMenuOutside)
    document.removeEventListener('wheel', this._onWheel, true)
    document.removeEventListener('touchmove', this._onTouchMove, true)
    document.removeEventListener('keydown', this._onDocumentKeydown)
    this._contentObserver.disconnect()
    this._menuPositionGeneration.invalidate()
    this._outsideClickGuard.dispose()
    this._hoverBinder.dispose()
    this._scrollLock.release()
    this._menuHandle?.release()
    this._menuHandle = null
    this._returnItemsToSlot()
    this._menu?.panel.remove()
    this._menu = undefined
    this._closeSubmenusFrom(0, true)
    this._closingSubmenus.restoreAll()
    /*
     * scrim 挂在 document.body 上，不随宿主一起脱离文档。不在这里收掉就会留下一张
     * 仍然 `showModal()` 的全屏 dialog：top layer 不受宿主移除影响，整个页面就此锁死。
     */
    this._closeScrim()
    // 脱离文档即视为关闭：否则重连后 _isOpen 仍为 true 而 _menu 已清空，
    // 下次 openAt 会走已打开分支静默失败，菜单无法再打开。
    this._isOpen = false
    this._cancelLongPress()
    this._longPressOpenedAt = null
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
          /*
           * 顺序：先建 scrim 并 `showModal()`，再把面板挂进去。
           *
           * `showModal()` 会把此前聚焦的元素记为还原目标；此刻焦点仍在 opener 上，
           * 正是归还目标。面板随后 `_focusFirstItem()` 把焦点带进菜单，关闭时 UA 还回去。
           *
           * 面板挂进 scrim 是承重的，不是「顺手放一起」：top layer 只对**自身子树内的
           * 元素**做命中拦截，面板若留在 overlay root（scrim 之外），模态期间它自己就不可点。
           */
          const scrim = this._openScrim()
          this._menu = createMenuPortalOverlay('context-menu', this, scrim)
          this._menu.panel.setAttribute('role', 'menu')
          this._menu.panel.setAttribute('aria-label', '上下文菜单')
          this._menu.panel.addEventListener('click', this._onMenuClick)
        }
        /*
         * 登记与面板建立解耦。退场动画被打断时（`_closeMenuAfterPresence` 在
         * `hideOverlayPresence` 返回 false 后提前退出）`_menu` 还在，而关闭分支已经把句柄
         * 撤了；此时重开必须补 claim。否则菜单开着且可见却没有登记：Escape 关不掉它
         * （仲裁看不到它），而 `_menuHandle === null` 会让每次 document click——包括面板
         * 内部与子菜单父项——都被 `_outsideClickGuard` 判成外部点击而关闭菜单。
         */
        if (!this._menuHandle) {
          this._menuHandle = this._overlay.claim(this._menu.panel)
          // 重新 claim = 新会话：根层的子层随之作废，仍在场的子菜单面板要重新 adopt 回
          // 新句柄的子树，否则根句柄的 contains 看不到它们。
          for (const submenu of this._activeSubmenus) {
            this._submenuHandles.delete(submenu.panel)
            this._submenuHandles.set(submenu.panel, this._menuHandle.adopt(submenu.panel))
          }
          // 收尾栈里的子菜单面板同样「可见但已脱离快照」：`_closeSubmenusFrom` 只把它们
          // 移出 `_activeSubmenus`，面板仍在 DOM 里退场。**这个循环承重**：不补 adopt，
          // 它们就会落在句柄的登记树之外，被判成「面板外」，点它内部会关掉整张菜单。
          // 用例 `退场窗口内重开后，收尾中的子菜单面板在取回前后都不可被当成面板外` 守着
          // 这一条 —— 把循环体整段删掉，那条会红（实测 1 failed | 95 passed）。
          // 写进 `_submenuHandles` 还因为收尾结束时 `_releaseSubmenu` 按 panel 取句柄释放。
          for (const container of this._closingSubmenus.closing()) {
            this._submenuHandles.set(container.panel, this._menuHandle.adopt(container.panel))
          }
        }
        // 父项始终留在 menu.content 内，观察它即可覆盖各级子菜单在打开期间的内容重建。
        this._contentObserver.observe(this._menu.content, { childList: true, subtree: true })
        requestAnimationFrame(() => {
          if (!this._isOpen || !this._menu) return
          this._refreshMenu()
          showOverlayPresence(this._menu.panel, { isInstant: this._shouldOpenInstantly })
          this._shouldOpenInstantly = true
          /*
           * 首项聚焦必须再等一帧，不能和 `_refreshMenu()` 同帧。
           *
           * 两个原因都指向「太早」：
           *
           * 1. `showModal()` 的 dialog focusing steps 由 UA 排队执行，会在我们已经聚焦首项
           *    **之后**再把焦点挪到 dialog 上 —— 模态化之前没有这一步，也就没有这场竞争。
           * 2. `_setupMenuItems()` 刚创建的 `web-ui-dropdown-item` 尚未完成 Lit 的 shadow
           *    渲染，`focusItem()` 此刻还找不到 `.item-inner`，静默无操作。
           *
           * 实测：同帧聚焦后 `document.activeElement` 是 `<dialog>` 而非首项；再等一帧聚焦，
           * 焦点稳定落在菜单项内。
           */
          requestAnimationFrame(() => {
            if (!this._isOpen || !this._menu) return
            this._focusFirstItem()
          })
        })
      } else {
        this._syncScrollLock(false)
        // 吸收窗口只覆盖「长按之后浏览器补发的那几个事件」。菜单已关，
        // 之后任何一次真实右键或点击都必须走正常路径，不能被这个窗口吞掉。
        this._longPressOpenedAt = null
        // release ⟺ 关闭：登记与仲裁归属同时撤销，退场动画只是视觉收尾。
        this._menuHandle?.release()
        this._menuHandle = null
        this._contentObserver.disconnect()
        this._menuPositionGeneration.invalidate()
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
    this._openAt(x, y, true, true)
  }

  private _openAt(
    x: number,
    y: number,
    isInstant: boolean,
    suppressFocusVisible: boolean,
    centerOnPressPoint = false
  ): boolean {
    if (this.disabled) return false
    this._x = x
    this._y = y
    this._shouldOpenInstantly = isInstant
    this._suppressInitialFocusVisible = suppressFocusVisible
    this._centerOnPressPoint = centerOnPressPoint
    this._outsideClickGuard.arm()
    if (this._isOpen) {
      this._closeSubmenusFrom(0, true)
      this._closingSubmenus.restoreAll()
      // 先失效尚未完成的旧定位，再调度下一帧新代；避免新请求前的旧 promise 胜出。
      this._menuPositionGeneration.invalidate()
      this._scheduleRefresh()
      return false
    }
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
    this._menuPositionGeneration.invalidate()
    /*
     * 菜单项激活触发的关闭要**现在**就让 scrim 出顶层，不能等退场结束。
     *
     * 焦点归还由 UA 负责（`close()` 把焦点还给 `showModal()` 之前的 activeElement），
     * 而菜单项的回调常紧接着把焦点送到别处 —— 典型是右键重命名：回调把行换成编辑态、
     * 下一帧 `select()` 进 textarea。等到退场结束才关，UA 的归还会把焦点从 textarea
     * 拽回那一行，blur 掉编辑器，而 editable-text 的 blur 契约会**提交未改动的标题**。
     * 那是 interweave 上真实存在的 bug，不能放回来。
     *
     * 此刻焦点还在菜单里，UA 的归还正好落在 opener 上——那本来就是用户期望的落点，
     * 应用随后的焦点转移不会被覆盖。元素本身要留到面板真正移除（见 `_releaseScrimModality`）。
     */
    if (this._closeSource === 'menu-item') this._releaseScrimModality()
    this._closeSource = 'default'
  }

  private readonly _closeFromUser = (source: CloseSource = 'default') => {
    if (!this._isOpen) return
    this._userOpenChange.mark()
    this._closeSource = source
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

  /**
   * 定位：**触屏长按与鼠标右键共用这一条 Floating UI 路径**。
   *
   * 两条入口现在只差「触发点的 x/y 从哪来」，布局契约完全一致：
   * `bottom-start` 表达「面板上缘 == 触发点 y、向下展开」，水平以触发点 x 为基准。
   * 之前有一条手写的贴底分支（先按点、再按视口下缘算 `top`），那是把「贴视口底」硬编码
   * 成算术；真机反馈证明它错（菜单跑到屏幕最底部，与手指按下的位置完全脱节）。现在
   * 落点交给 `flip` / `shift` 按**实际空间**决定，`placement` 只表达意图。
   *
   * 不再按「是否触屏」分流：窄视口的鼠标右键同样期望菜单贴着光标出现，按输入类型或视口
   * 宽度分流会让同一块屏幕上的两种输入拿到两套布局。分流所需的 `_anchorAtPressPoint`
   * 连同 `_positionMenuInViewport` / `_positionMenuAtPressPoint` 两个方法一起删掉 ——
   * 面板恒为 open scrim `<dialog>` 的直接子节点（`createMenuPortalOverlay` 第三参传入
   * scrim，`menu-portal.ts` 里 `container = scrim ?? …`），所以旧代码那条
   * 「非 dialog 容器」的分支对 context-menu 本来就不可达。
   *
   * 算出来的 left/top 是**视口坐标**。面板是 `position: fixed`，而 scrim 刻意不带
   * transform / filter / contain（见 style.css），因此不构成 fixed 的包含块 ——
   * 坐标直接相对视口解析。这条等价关系由 style.css 的满屏声明保证，并由 R6 的
   * 「scrim 无 transform/filter/contain」+ viewport-fit 的几何断言兜底。
   */
  private _positionMenu() {
    const panel = this._menu?.panel
    if (!panel) return

    /*
     * 先读安全区，再碰面板：`getComputedStyle` 会强制一次同步布局，让它发生在面板进入
     * 「可测」状态之前，而不是夹在「面板刚可测」与「Floating UI 量它」之间。
     *
     * 需要说清楚的是，**这不是** viewport-fit 那条横向断言里 2px 抖动的成因。把这一行移到
     * 最前面实测并没有让那个偏差消失（改前改后都是 204 对期望 206）。那个 2px 来自 flip 的
     * reset 会多跑一轮测量：那一刻面板宽 202px、落定后 200px。相关用例已经不再钉与视口
     * 边界的精确距离。
     */
    const safeAreaBottom = this._safeAreaBottom()

    panel.style.visibility = 'hidden'
    panel.style.display = ''

    const generation = this._menuPositionGeneration.next()
    /*
     * 可用矩形 = 视口 − 安全区 − 最小间距。flip 与 shift 必须吃**同一份** padding：
     *
     * - flip 用它判断「这一侧放不放得下」，决定翻不翻；
     * - shift 用它做实际钳制，且 `crossAxis: true` 会**同时**钳主轴与交叉轴
     *   （core 的 shift 默认 mainAxis=true / crossAxis=false，开了 crossAxis 才两边都管）。
     *
     * 安全区必须进 shift 而不只是 flip：flip 只挑「哪一侧」，挑完就把面板贴在触发点上，
     * 不再管这一侧内部的位置。触发点本身落在安全区里时（按在屏幕最底部），挑出来的
     * 「上方」那一侧仍然把面板下缘按在安全区里 —— 只有 shift 的主轴钳制会把它推上来。
     * 这条正是 R7 用例在钉的行为。
     */
    const boundaryPadding = {
      top: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING + safeAreaBottom,
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING
    }
    /*
     * 限制 flip 的候选集为「下方 / 上方」两个，**刻意不含 `-start` / `-end` 的另一侧**。
     *
     * 为什么必须限制：`flip` 对对齐过的 placement（`bottom-start`）默认展开成
     * `getExpandedPlacements()`，候选里带着 `bottom-end` / `top-end`。于是鼠标贴视口右缘、
     * `bottom-start` 的对齐侧溢出时，flip 会认定「`bottom-end` 才放得下」并把面板整个挪到
     * 光标左侧。落点仍在视口内，但那是一次没人要求的契约变更 —— 水平夹取本来就归 shift，
     * 而且对齐量一变，transform-origin 的推导前提（对齐量不变 ⇒ 水平 origin 只由 shift 位移
     * 决定）就不成立了。
     *
     * 用的是 `fallbackPlacements` 而不是 `allowedPlacements`：后者是 `autoPlacement` 的选项，
     * `flip` 根本不读，传进去只会被静默忽略（TS 会报错，运行时会当成 padding 之外的字段丢掉）。
     * `fallbackPlacements` 正是 flip 用来**替换**上面那个默认展开列表的字段，指定后
     * `placements = [initialPlacement, ...fallbackPlacements]`，连 bestFit 兜底也只在这份
     * 候选里挑，`-end` 因此永远不可能出现。
     *
     * 用例「鼠标贴视口右缘时对齐量不被 flip 改成 -end」钉的就是这一条。
     */
    const placements = this._centerOnPressPoint
      ? (['bottom', 'top'] as const)
      : (['bottom-start', 'top-start'] as const)

    void computePosition({ getBoundingClientRect: () => new DOMRect(this._x, this._y, 0, 0) }, panel, {
      strategy: 'fixed',
      /*
       * `bottom`（触屏）：面板上缘对齐触发点 y、水平居中于触发点 x。
       * `bottom-start`（鼠标）：同样上缘对齐 y，但左缘对齐光标 x。理由见
       * `_centerOnPressPoint` —— 居中会把光标落进面板上缘的命中区。
       *
       * 居中在贴边时**必然**被 shift 的交叉轴钳制打破（按点 x 太靠边，居中的面板会溢出视口）。
       * 这不是缺陷而是取舍：完整可见优先于几何居中。shift 推完面板仍在视口内，
       * 只是不再居中 —— 用例「按点贴视口右缘时仍完整可见」钉的就是这一条。
       */
      placement: placements[0],
      middleware: [
        /*
         * flip 负责「向下放不下就翻到按点上方」—— 面板下缘对齐按点、向上长。
         * 两侧都放不下（按点极低且面板极高）时它按 bestFit 选空间多的一侧并夹住主轴，
         * 所以不需要自己再写一遍兜底夹取。
         */
        flip({ fallbackPlacements: [...placements], padding: boundaryPadding }),
        shift({ padding: boundaryPadding, crossAxis: true })
      ]
    }).then(({ x, y, placement, middlewareData }) => {
      if (!this._isOpen || this._menu?.panel !== panel || !this._menuPositionGeneration.isCurrent(generation)) return
      const shiftX = middlewareData.shift?.x ?? 0
      /*
       * 垂直 origin 取 flip 后的实际 placement，不看 shift 位移：placement 直接说明面板
       * 落在触发点的哪一侧，而「离触发点最近的那条边」就是 scale 应该长出来的地方。
       *
       * 水平：默认跟 placement 的对齐量；被 shift 推动时改用推动方向那一侧，菜单才是朝
       * 光标「长过来」而不是从视口边缘滑进去。居中（placement 不带 `-` 对齐后缀）且未被
       * 推动时保持 `center`。
       */
      const horizontalOrigin = !placement.includes('-')
        ? shiftX === 0
          ? 'center'
          : shiftX < 0
            ? 'right'
            : 'left'
        : shiftX < 0
          ? 'right'
          : 'left'
      this._applyMenuPosition(panel, x, y, horizontalOrigin, placement.startsWith('bottom') ? 'top' : 'bottom')
    })
  }

  /**
   * 视口下缘的安全区高度（px）。
   *
   * 改按压点展开之后它**仍然必需**，而且不再只服务触屏：菜单默认从触发点向下长，触发点
   * 落在屏幕下半部时面板下缘会进入 home indicator 区域。它现在折进 flip 与 shift 共用的
   * 边界 padding（见 `_positionMenu`），不再需要单独一条 `maxBottom` 算术。
   *
   * 读宿主的自定义属性而不是 `env()`：自定义属性读回的是**计算后**的解析值，
   * 而 `env()` 在 JS 里没有对应的求值入口，只能间接经由声明它的属性取。
   * 属性未解析时 `parseFloat` 得 NaN，落到 0 —— 与 `env(..., 0px)` 的缺省一致。
   */
  private _safeAreaBottom(): number {
    const value = Number.parseFloat(getComputedStyle(this).getPropertyValue('--wui-context-menu-safe-area-bottom'))
    return Number.isFinite(value) ? value : 0
  }

  /**
   * 写下面板坐标与进场 transform 的原点。
   *
   * 两个 origin 必传且**不**再回退成坐标比较：flip 会改变垂直方向，回退表达式
   * `y < this._y ? 'bottom' : 'top'` 在「面板顶边与触发点重合」时两边都成立，等于随机取。
   * 唯一调用方从 flip 后的 placement 与 shift 位移推出真实侧边，见 `_positionMenu`。
   */
  private _applyMenuPosition(
    panel: HTMLElement,
    x: number,
    y: number,
    horizontalOrigin: 'left' | 'right' | 'center',
    verticalOrigin: 'top' | 'bottom'
  ) {
    panel.style.left = `${x}px`
    panel.style.top = `${y}px`
    panel.style.setProperty('--wui-internal-overlay-transform-origin', `${verticalOrigin} ${horizontalOrigin}`)
    panel.style.visibility = ''
  }

  /**
   * 把焦点带进菜单的第一项。
   *
   * `attempt` 是重试计数：菜单项是刚被 `reconcileManagedMenuItems` 搬进来的自定义元素，
   * 它们的 shadow（`.item-inner`）由各自的 Lit 更新**异步**渲染。`focusMenuItem()` 委托给
   * 项的 `focusItem()`，那一刻 `.item-inner` 还不存在，于是**静默无操作** —— 不抛错、
   * 也不留痕，只表现为「菜单开了但焦点没进去」。
   *
   * 所以这里不假设一次成功：调用后用 `findFocusedMenuItem` 复核，没落上就在下一帧再试，
   * 最多 `FOCUS_FIRST_ITEM_ATTEMPTS` 次。上界是必要的 —— 菜单项若始终渲染不出来
   * （空菜单、内容被外部换掉），不能让重试链一直跑下去。
   */
  private _focusFirstItem(attempt = 0) {
    const items = this._menu?.content.querySelectorAll<HTMLElement>('web-ui-dropdown-item:not([disabled])')
    const firstItem = items?.[0]
    if (!firstItem) return
    focusMenuItem(firstItem, { suppressFocusVisible: this._suppressInitialFocusVisible })
    if (attempt + 1 >= FOCUS_FIRST_ITEM_ATTEMPTS) return
    if (findFocusedMenuItem([this._menu?.panel])) return
    requestAnimationFrame(() => {
      if (!this._isOpen || !this._menu) return
      this._focusFirstItem(attempt + 1)
    })
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

  /**
   * 建 scrim 并让它进入模态态，返回容器供面板挂载。
   *
   * 每次开启都新建而不是复用：scrim 的生命周期必须与「这一次开启」严格同进同出。
   * 复用一个 dialog 意味着上一轮的 `close()` 事件、`open` 属性与 UA 记下的焦点还原目标
   * 会跨会话残留，而这些都不是本组件能重置的。
   */
  private _openScrim(): HTMLDialogElement {
    const scrim = document.createElement('dialog')
    scrim.className = 'wui-context-menu-scrim'
    /*
     * scrim 的样式必须**显式挂到 scrim 元素上**。
     *
     * `static styles`（style.css）只进宿主的 shadow root，而 scrim 是 `document.body` 下的
     * light DOM 节点，拿不到那份样式；`scrim.css` 若只躺在文件里而不注入，就是死代码。
     * 实测未注入时 scrim 完全是 UA 默认 `dialog:modal` 的样子：`margin: auto` +
     * `width/height: fit-content` 让它在 414x896 视口里缩成 **38x38 的白盒子**正中，
     * `background` 还是不透明白 —— 菜单一开就在屏幕中间糊一块白色方块。
     *
     * 用子 `<style>` 而不是行内 `cssText`：与 `menu-portal.ts` 对 dialog 容器注入共享样式
     * 是同一手法（那边已在 dialog 容器上验证过），随元素一起移除，不留全局残留。
     */
    const scrimStyles = document.createElement('style')
    scrimStyles.textContent = scrimStyle
    scrim.append(scrimStyles)
    scrim.setAttribute(SCRIM_ATTR, '')
    scrim.addEventListener('click', this._onScrimClick)
    scrim.addEventListener('cancel', this._onScrimCancel)
    // showModal() 要求元素已在文档中。
    document.body.append(scrim)
    scrim.showModal()
    this._scrim = scrim
    return scrim
  }

  /**
   * 关掉并摘除 scrim。幂等：关闭分支与 `disconnectedCallback` 都会调。
   *
   * `close()` 触发 UA 的焦点归还，**必须先于面板 `remove()`** —— 理由见 `_closeMenuAfterPresence`。
   */
  private _closeScrim() {
    const scrim = this._scrim
    if (!scrim) return
    this._scrim = undefined
    if (scrim.open) scrim.close()
    scrim.remove()
  }

  /**
   * 只让 scrim 出顶层，不摘除元素。面板挂在 scrim 里，摘了就把退场动画一起摘掉。
   *
   * 提前出顶层是为了焦点（理由见 `close()`）。代价是这个尾巴上 scrim 已经在 top layer
   * 之外：下层恢复可命中，且面板的层级退回普通流 —— 在「菜单开在 drawer/dialog 之上」
   * 的场景里，退场动画会被下层的 top layer 盖住。
   *
   * 这条尾巴只有一次退场过渡的时长（默认 160ms），且只发生在菜单项激活时。
   * 摘除仍在 `_closeScrim()`，那时面板已经走完。
   */
  private _releaseScrimModality() {
    const scrim = this._scrim
    if (scrim?.open) scrim.close()
  }

  /**
   * 点 scrim = 关菜单（Q12：必关，不给 prop 选项），与 dialog / drawer 的实现同形：
   * 只有落点就是 scrim 本身才算「点外面」，落在面板（scrim 的后代）上不算。
   *
   * 落点判据之所以只能是这两个，是模态给的：菜单打开期间下层收不到命中，事件只可能
   * 落在 scrim 或面板上，两者都由本组件判定。
   *
   * 更早的实现在 document 捕获阶段挂 click 监听，把「点外面」理解成「命中测试落在菜单
   * 面板之外」—— 宿主 light DOM 的每一行都满足这个条件，于是判定与行激活成了同一个
   * click 的两个后果，中间没有任何仲裁，下层目标先被激活。那条监听器连同它的实现已一并
   * 删除：模态化之后它没有任何还能生效的场景，别再挂回来。
   */
  private _onScrimClick = (e: MouseEvent) => {
    if (e.target !== this._scrim) return
    // 长按抬手后浏览器补发的 click 属于那一次触摸意图，不能把刚开的菜单关掉。
    if (this._isLongPressFollowUp()) return
    this._closeFromUser()
  }

  /**
   * Escape 的**唯一**关闭路径仍是共享仲裁者（`_overlay.requestClose` → `closeDeepestOrAll`），
   * 它按层深决定是关最深子菜单还是关整张菜单。原生 dialog 自己也监听 Escape 并派发
   * `cancel`，若放任默认行为，UA 会直接关掉 scrim —— 那条路径不经过组件状态机，
   * 既可能漏派 `open-change`，也会把「关最深一层」的语义降级成「整张菜单没了」。
   *
   * 因此这里只吞掉默认行为，不重复关闭。仲裁者那条路径已经会走 `_closeFromUser()`。
   */
  private _onScrimCancel = (e: Event) => {
    e.preventDefault()
  }

  private async _closeMenuAfterPresence() {
    const menu = this._menu
    if (menu && !(await hideOverlayPresence(menu.panel))) return
    if (this._isOpen || !this.isConnected || this._menu !== menu) return

    /*
     * 归还判定必须在移除面板之前做完：面板一脱离文档，「焦点仍在菜单内」就再也读不到了。
     * 子菜单层此刻仍可能持有焦点，一并计入。
     */
    /*
     * 先关 scrim 再摘面板，顺序不能反。
     *
     * 焦点归还是 `showModal()` / `close()` 的 UA 行为，不再由组件自己实现：UA 记的是
     * `showModal()` 之前的 `document.activeElement`，`close()` 时还回去。反过来做就成了
     * 实测里那条「open 中直接移除 dialog → 焦点丢到 body，不归还」——面板先脱离文档，
     * 焦点链断了，UA 的还原目标也就落空。
     *
     * 菜单项激活那条路径的 scrim 早在 `close()` 里就出了顶层（`_releaseScrimModality`），
     * 这里的 `close()` 对它是幂等空转，摘除照常发生。
     *
     * 「关闭期间焦点被外部接管时不抢回」那道防护不是被删除，是被**移到了更早的位置**：
     * UA 自己没有这个分支（实测：外部接管后 close，焦点必被抢回 opener，`close()` /
     * `remove()` / `open = false` / 摘 `open` / 置 `display:none` / opener 移除或不可聚焦，
     * 十种写法全都照旧夺焦点）。所以只能在焦点**还没被送走**的时候就把顶层让掉 ——
     * 也就是菜单项激活那一刻。点外面 / Escape / 程序式关闭不抢焦点是用户期望的语义，
     * 那三条保留 dialog 默认效果。
     */
    this._closeScrim()

    // 登记已在关闭分支撤销（release ⟺ 关闭），这里只做内容归还与 DOM 收尾。
    this._returnItemsToSlot()
    menu?.panel.remove()
    this._menu = undefined
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
      /*
       * 取回的面板写回 `_submenuHandles`，让收尾结束时的 `_releaseSubmenu` 释放到正确的句柄。
       * 注：「面板在根句柄子树里」这一条已由上面的 claim 分支保证 —— 该分支会把仍在
       * closing 栈里的面板一并重挂（`_closingSubmenus.closing()`）。实测单独摘掉这一行
       * 全部用例仍绿，所以它维护的是释放账本，不是树的成员关系。
       *
       * **这一行没有任何测试守护**：把 `adopt` 与 `set` 一起摘掉，context-menu 的 96 条
       * 用例仍然全绿（实测 96 passed）。所以下面写的是「当前如此」—— 这一行维护的是
       * 释放账本（收尾结束时 `_releaseSubmenu` 按 panel 取句柄），不是树的成员关系；
       * 成员关系由上面 claim 分支的 `_closingSubmenus.closing()` 循环负责，那一条**是**
       * 有测试的。改动这一行前请自己判断要不要补一条能红的用例，别把这里的沉默当成覆盖。
       */
      if (this._menuHandle) this._submenuHandles.set(closingSubmenu.panel, this._menuHandle.adopt(closingSubmenu.panel))
      item.setAttribute('active', '')
      this._positionSubmenu(item, closingSubmenu)
      showOverlayPresence(closingSubmenu.panel, { isInstant })
      this._hoverBinder.bind()
      return
    }
    if (getMenuChildren(item).length === 0) return

    /*
     * 子菜单与根菜单挂进**同一个** scrim。只改根菜单会让两层行为分裂：根层被 scrim
     * 罩住时，子菜单若仍留在 overlay root，它自己就成了 scrim 子树外的元素 —— 模态期间
     * 不可点，且点它内部会被判成「点外面」而关掉整张菜单。
     */
    const submenu = createMenuPortalOverlay('context-submenu', this, this._scrim)
    submenu.panel.dataset.level = String(level)
    submenu.panel.setAttribute('role', 'menu')
    submenu.panel.setAttribute('aria-label', '子菜单')
    submenu.panel.style.visibility = 'hidden'
    submenu.panel.addEventListener('click', this._onMenuClick)
    moveMenuChildren(item, submenu.content)

    this._activeSubmenus[level] = submenu
    this._activeSubmenuItems[level] = item
    /*
     * 子层进根句柄的子树，默认不是独立候选 —— 「它在树里、但不参与这一层裁决」由此
     * 表达。原先按 level===0 选择根面板还是上一层子面板的父级判断随之消失：contains
     * 沿子树递归，拍平与嵌套对任何现有查询结果等价。
     */
    if (this._menuHandle) this._submenuHandles.set(submenu.panel, this._menuHandle.adopt(submenu.panel))
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
        if (submenu) this._releaseSubmenu(submenu.panel)
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

  private _onPointerDown = (e: PointerEvent) => {
    // 任何一次新的按下都结束「上一次长按的补发事件」窗口：抬手后浏览器合成的
    // click 一定早于下一次 pointerdown，所以这个边界既能吸收补发，又不会误吞
    // 用户之后真正的点击。
    this._longPressOpenedAt = null
    // 鼠标走原生 contextmenu，无需长按；只认触屏指针。
    if (!this.longPress || this.disabled || e.pointerType !== 'touch') return
    this._cancelLongPress()
    this._longPressOrigin = { x: e.clientX, y: e.clientY }
    this._longPressTimer = setTimeout(
      () => {
        this._longPressTimer = undefined
        const origin = this._longPressOrigin
        if (!origin) return
        this._longPressOrigin = undefined
        if (this._isOpen) return
        this._longPressOpenedAt = performance.now()
        // 触屏长按：面板上缘对齐按点、向下展开，水平居中于按点（判据见 `_centerOnPressPoint`）。
        if (this._openAt(origin.x, origin.y, false, true, true)) this._userOpenChange.mark()
      },
      // 属性已被 normalizeNumber 钳到 [0, 5000]，这里直接用；不再二次 Math.max。
      this.longPressDelay
    )
  }

  private _onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const origin = this._longPressOrigin
    if (!origin) return
    // 触屏有隐式指针捕获，pointermove 会持续派发到 pointerdown 的落点，
    // 因此位移超阈值即判定为滚动意图，取消长按。
    const distance = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
    if (distance > LONG_PRESS_MOVE_TOLERANCE) this._cancelLongPress()
  }

  private _onPointerUp = (e: PointerEvent) => {
    if (e.pointerType === 'touch') this._cancelLongPress()
  }

  private _onPointerCancel = () => {
    this._cancelLongPress()
  }

  private _cancelLongPress() {
    if (this._longPressTimer !== undefined) {
      clearTimeout(this._longPressTimer)
      this._longPressTimer = undefined
    }
    this._longPressOrigin = undefined
  }

  /** 该事件是否是长按开菜单之后、浏览器为同一次触摸补发的事件。 */
  private _isLongPressFollowUp(): boolean {
    const openedAt = this._longPressOpenedAt
    if (openedAt === null) return false
    // 超期只说明「这次长按的补发没来」，不代表窗口承担时序保证；见常量注释。
    if (performance.now() - openedAt > LONG_PRESS_FOLLOW_UP_WINDOW_MS) {
      this._longPressOpenedAt = null
      return false
    }
    return true
  }

  private _onContextMenu = (e: MouseEvent) => {
    if (this.disabled) return
    if (this._isLongPressFollowUp()) {
      e.preventDefault()
      return
    }
    e.preventDefault()
    if (this._openAt(e.clientX, e.clientY, false, true)) this._userOpenChange.mark()
  }

  private _onContextMenuOutside = (e: MouseEvent) => {
    if (this._isOpen && !this._outsideClickGuard.isInside(e)) {
      this._closeFromUser()
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled) return

    if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      e.preventDefault()
      const focused = document.activeElement
      if (focused && focused !== document.body) {
        const rect = focused.getBoundingClientRect()
        if (this._openAt(rect.left, rect.bottom, true, false)) this._userOpenChange.mark()
      } else {
        if (this._openAt(window.innerWidth / 2, window.innerHeight / 2, true, false)) this._userOpenChange.mark()
      }
      return
    }
  }

  private _onMenuClick = (e: MouseEvent) => {
    const item = getMenuItemFromEvent(e)
    if (!item || item.hasAttribute('disabled')) return
    if (item.hasAttribute('submenu')) {
      this._openSubmenu(item)
      return
    }
    this._closeFromUser('menu-item')
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

  /** 按 panel 撤销一层子菜单的登记；句柄已随根层递归撤销时幂等无操作。 */
  private _releaseSubmenu(panel: HTMLElement) {
    this._submenuHandles.get(panel)?.release()
    this._submenuHandles.delete(panel)
  }

  private _isMenuPanelEvent(e: Event): boolean {
    // 在监听器内部判定：composedPath() 在派发结束后会被清空。
    return this._menuHandle?.containsEvent(e) ?? false
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
