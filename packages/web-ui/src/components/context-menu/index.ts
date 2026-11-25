import { computePosition, flip, shift } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'

import { UserChangeController } from '@/shared/events/user-change'
import {
  createMenuPortalOverlay,
  createMenuSession,
  getMenuItemFromEvent,
  type MenuPortalOverlay
} from '@/shared/menu-session'
import { normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { registerModalLayer, unregisterModalLayer } from '@/shared/overlay/modal-layer-stack'
import { defineOverlayPositioningGeneration } from '@/shared/overlay/positioning-generation'
import { findNearestTheme } from '@/shared/overlay/theme-overlay-scope'

import scrimStyle from './scrim.css?inline'
import style from './style.css?inline'

const MARKER_TEXT = 'wui-context-menu-item'
const HIDDEN_SLOT = 'context-menu-hidden'

/** 与 iOS / Android 原生长按一致的默认时长。 */
const DEFAULT_LONG_PRESS_DELAY = 500
/** long-press-delay 的上界：超过 5s 的长按不再是「长按」，等同没有该属性。 */
const MAX_LONG_PRESS_DELAY = 5000
/** 按住期间的容差位移；超出即视为滚动/拖拽意图，取消长按。 */
const LONG_PRESS_MOVE_TOLERANCE = 10
/**
 * 长按开 menu 后吸收浏览器补发事件的窗口上限（起点为手势结束 pointerup）。
 */
const LONG_PRESS_FOLLOW_UP_WINDOW_MS = 1000

/** menu 打开期间铺在整屏上的 scrim `<dialog>`。 */
const SCRIM_ATTR = 'data-wui-menu-scrim'

type CloseSource = 'menu-item' | 'default'

/** 首项聚焦的最大尝试次数（含首次）。 */
const FOCUS_FIRST_ITEM_ATTEMPTS = 5

/** panel 与视口边缘的最小间距，与既有夹取算术同源。 */
const VIEWPORT_PADDING = 8

@customElement('web-ui-context-menu')
export class WebUiContextMenu extends LitElement {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false
  /** opt-in：触屏长按打开 menu。默认关闭，鼠标路径靠原生 contextmenu，无需此属性。 */
  @property({ type: Boolean, reflect: true, attribute: 'long-press' }) longPress = false

  private _longPressDelay = DEFAULT_LONG_PRESS_DELAY

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

  private _longPressTimer: ReturnType<typeof setTimeout> | undefined
  private _spaceTimer: ReturnType<typeof setTimeout> | undefined
  private _spaceTarget: HTMLElement | undefined
  private _spaceOpened = false
  private _replayingSpace = false
  private _longPressOrigin: { x: number; y: number } | undefined
  private _longPressOpenedAt: number | null = null
  private _longPressGestureEndedAt: number | null = null
  private _longPressGestureOpenedMenu = false
  private _followUpClickAbsorber?: (event: MouseEvent) => void

  // submenu dialog 定位的唯一写者代数（按 panel 键控）：同帧关闭→重开复用同一 panel
  // 时只允许最新一次定位写入；不同层级 submenu 各有 panel，互不作废。
  private readonly _submenuPositionEpochs = new WeakMap<HTMLElement, number>()
  private _scrim?: HTMLDialogElement
  private _centerOnPressPoint = false
  private _closeSource: CloseSource = 'default'
  private _menuItemActivationEvent: Event | null = null
  private readonly _userOpenChange = new UserChangeController()
  private _shouldOpenInstantly = true
  private _suppressInitialFocusVisible = true
  private readonly _menuPositionGeneration = defineOverlayPositioningGeneration().make()

  private readonly _session = createMenuSession<MenuPortalOverlay>({
    host: this,
    markerText: MARKER_TEXT,
    hiddenSlot: HIDDEN_SLOT,
    createRootTiming: 'sync',
    hideHostChildren: true,
    preventBackgroundScroll: true,
    closeOnLeafClick: true,
    isScrollLockDisabled: () => this.noScrollLock,
    onRequestClose: reason => {
      this._closeFromUser(reason === 'leaf-click' ? 'menu-item' : 'default')
    },
    beforeRootCleanup: () => {
      // 先关 scrim 触发 UA 焦点归还，再归还项并移除 panel，顺序不能反。
      this._closeScrim()
    },
    surface: {
      createRoot: () => {
        const scrim = this._openScrim()
        const menu = createMenuPortalOverlay('context-menu', this, scrim)
        menu.panel.setAttribute('role', 'menu')
        menu.panel.setAttribute('aria-label', 'Context menu')
        menu.panel.addEventListener('click', this._onMenuItemActivation, true)
        return menu
      },
      createSubmenu: ({ level }) => {
        const submenu = createMenuPortalOverlay('context-submenu', this, this._scrim)
        submenu.panel.dataset.level = String(level - 1)
        submenu.panel.setAttribute('role', 'menu')
        submenu.panel.setAttribute('aria-label', 'submenu')
        submenu.panel.style.visibility = 'hidden'
        submenu.panel.addEventListener('click', this._onMenuItemActivation, true)
        return submenu
      },
      positionRoot: surface => {
        this._positionMenu(surface.panel)
      },
      positionSubmenu: (surface, parentItem) => {
        this._positionSubmenu(parentItem, surface)
      },
      disposeSurface: (surface, level) => {
        surface.panel.removeEventListener('click', this._onMenuItemActivation, true)
        if (level > 0) this._submenuPositionEpochs.delete(surface.panel)
        surface.panel.remove()
      }
    }
  })

  get isOpen(): boolean {
    return this._isOpen
  }

  override connectedCallback() {
    super.connectedCallback()
    this._session.connect()
    this.addEventListener('contextmenu', this._onContextMenu)
    this.addEventListener('keydown', this._onKeydown)
    this.addEventListener('keydown', this._onSpaceDown, true)
    this.addEventListener('focusout', this._onSpaceFocusOut)
    document.addEventListener('keydown', this._onHeldSpaceRepeat, true)
    document.addEventListener('keyup', this._onSpaceUp, true)
    window.addEventListener('blur', this._onWindowBlur)
    this.addEventListener('pointerdown', this._onPointerDown)
    this.addEventListener('pointermove', this._onPointerMove)
    this.addEventListener('pointerup', this._onPointerUp)
    this.addEventListener('pointercancel', this._onPointerCancel)
    document.addEventListener('contextmenu', this._onContextMenuOutside)
    document.addEventListener('keydown', this._onDocumentKeydown)
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this.removeEventListener('contextmenu', this._onContextMenu)
    this.removeEventListener('keydown', this._onKeydown)
    this.removeEventListener('keydown', this._onSpaceDown, true)
    this.removeEventListener('focusout', this._onSpaceFocusOut)
    document.removeEventListener('keydown', this._onHeldSpaceRepeat, true)
    document.removeEventListener('keyup', this._onSpaceUp, true)
    window.removeEventListener('blur', this._onWindowBlur)
    this._cancelSpacePress()
    this.removeEventListener('pointerdown', this._onPointerDown)
    this.removeEventListener('pointermove', this._onPointerMove)
    this.removeEventListener('pointerup', this._onPointerUp)
    this.removeEventListener('pointercancel', this._onPointerCancel)
    document.removeEventListener('contextmenu', this._onContextMenuOutside)
    document.removeEventListener('keydown', this._onDocumentKeydown)
    this._menuPositionGeneration.invalidate()
    this._session.disconnect()
    this._closeScrim()
    this._isOpen = false
    this._cancelLongPress()
    this._longPressOpenedAt = null
    this._longPressGestureEndedAt = null
    this._longPressGestureOpenedMenu = false
    this._disarmFollowUpClickAbsorption()
  }

  protected override updated(changed: Map<string, unknown>) {
    if (changed.has('disabled') && this.disabled && !this._spaceOpened) this._cancelSpacePress()
    if (!this.isConnected) {
      this._session.syncHostState()
      return
    }

    if (changed.has('_isOpen')) {
      if (this._isOpen) {
        const isInstant = this._shouldOpenInstantly
        const suppressFocusVisible = this._suppressInitialFocusVisible
        this._shouldOpenInstantly = true
        this._session.open({
          isInstant,
          takeFocus: true,
          suppressFocusVisible,
          focusRetryAttempts: FOCUS_FIRST_ITEM_ATTEMPTS,
          deferFocusFrame: true
        })
      } else {
        this._longPressOpenedAt = null
        this._longPressGestureEndedAt = null
        this._menuPositionGeneration.invalidate()
        this._session.close()
      }
      if (this._userOpenChange.consume()) this._dispatchChange(this._isOpen)
    }
    if (changed.has('noScrollLock')) this._session.syncHostState()
  }

  /**
   * 在指定视口坐标打开 menu。
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
    if (this._isOpen) {
      this._menuPositionGeneration.invalidate()
      this._session.open({
        isInstant,
        takeFocus: false,
        suppressFocusVisible
      })
      return false
    }
    this._isOpen = true
    this._menuItemActivationEvent = null
    return true
  }

  /**
   * 关闭 menu。
   * @returns 无返回值；命令式关闭不派发 `open-change` 事件。
   */
  close() {
    if (!this._isOpen) return
    this._isOpen = false
    this._menuPositionGeneration.invalidate()
    if (this._closeSource === 'menu-item' || this._isDispatchingMenuItemActivation()) {
      this._releaseScrimModality()
    }
    this._closeSource = 'default'
    this._menuItemActivationEvent = null
  }

  private _isDispatchingMenuItemActivation(): boolean {
    return this._menuItemActivationEvent !== null && this._menuItemActivationEvent.eventPhase !== 0
  }

  private readonly _closeFromUser = (source: CloseSource = 'default') => {
    if (!this._isOpen) return
    this._userOpenChange.mark()
    this._closeSource = source
    this.close()
  }

  private _positionMenu(panel: HTMLElement) {
    const safeAreaBottom = this._safeAreaBottom()

    panel.style.visibility = 'hidden'
    panel.style.display = ''

    const generation = this._menuPositionGeneration.next()
    const boundaryPadding = {
      top: VIEWPORT_PADDING,
      bottom: VIEWPORT_PADDING + safeAreaBottom,
      left: VIEWPORT_PADDING,
      right: VIEWPORT_PADDING
    }
    const placements = this._centerOnPressPoint
      ? (['bottom', 'top'] as const)
      : (['bottom-start', 'top-start'] as const)

    void computePosition({ getBoundingClientRect: () => new DOMRect(this._x, this._y, 0, 0) }, panel, {
      strategy: 'fixed',
      placement: placements[0],
      middleware: [
        flip({ fallbackPlacements: [...placements], padding: boundaryPadding }),
        shift({ padding: boundaryPadding, crossAxis: true })
      ]
    }).then(({ x, y, placement, middlewareData }) => {
      if (
        !this._isOpen ||
        this._session.getRootSurface()?.panel !== panel ||
        !this._menuPositionGeneration.isCurrent(generation)
      ) {
        return
      }
      const shiftX = middlewareData.shift?.x ?? 0
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

  private _safeAreaBottom(): number {
    const value = Number.parseFloat(getComputedStyle(this).getPropertyValue('--wui-context-menu-safe-area-bottom'))
    return Number.isFinite(value) ? value : 0
  }

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

  private _openScrim(): HTMLDialogElement {
    const scrim = document.createElement('dialog')
    scrim.className = 'wui-context-menu-scrim'
    const scrimStyles = document.createElement('style')
    scrimStyles.textContent = scrimStyle
    scrim.append(scrimStyles)
    scrim.setAttribute(SCRIM_ATTR, '')
    scrim.addEventListener('click', this._onScrimClick)
    scrim.addEventListener('cancel', this._onScrimCancel)
    this._scrimParent().append(scrim)
    scrim.showModal()
    registerModalLayer(scrim)
    this._scrim = scrim
    return scrim
  }

  private _scrimParent(): HTMLElement {
    return findNearestTheme(this)?.getOverlayRoot() ?? document.body
  }

  private _closeScrim() {
    const scrim = this._scrim
    if (!scrim) return
    this._scrim = undefined
    if (scrim.open) scrim.close()
    unregisterModalLayer(scrim)
    scrim.remove()
  }

  private _releaseScrimModality() {
    const scrim = this._scrim
    if (scrim?.open) scrim.close()
    if (scrim) unregisterModalLayer(scrim)
  }

  private _onScrimClick = (e: MouseEvent) => {
    if (e.target !== this._scrim) return
    if (this._isLongPressFollowUp()) return
    this._closeFromUser()
  }

  private _onScrimCancel = (e: Event) => {
    e.preventDefault()
  }

  private _positionSubmenu(item: HTMLElement, submenu: MenuPortalOverlay) {
    if (submenu.panel.parentElement instanceof HTMLDialogElement && submenu.panel.parentElement.open) {
      const itemRect = item.getBoundingClientRect()
      const padding = 8
      const canOpenRight = itemRect.right + submenu.panel.offsetWidth + padding <= window.innerWidth
      const epoch = (this._submenuPositionEpochs.get(submenu.panel) ?? 0) + 1
      this._submenuPositionEpochs.set(submenu.panel, epoch)
      void computePosition(item, submenu.panel, {
        strategy: 'fixed',
        placement: canOpenRight ? 'right-start' : 'left-start',
        middleware: [shift({ padding, crossAxis: true })]
      }).then(({ x, y, middlewareData }) => {
        if (!submenu.panel.isConnected || epoch !== this._submenuPositionEpochs.get(submenu.panel)) return
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
    const padding = 8
    const submenuWidth = submenu.panel.offsetWidth
    const submenuHeight = submenu.panel.offsetHeight
    const canOpenRight = itemRect.right + submenuWidth + padding <= window.innerWidth
    const left = canOpenRight ? itemRect.right : Math.max(padding, itemRect.left - submenuWidth)
    const top = Math.min(Math.max(padding, itemRect.top), window.innerHeight - submenuHeight - padding)

    submenu.panel.style.left = `${left}px`
    submenu.panel.style.top = `${top}px`
    submenu.panel.style.setProperty('--wui-internal-overlay-transform-origin', canOpenRight ? 'top left' : 'top right')
    submenu.panel.style.visibility = ''
  }

  private _dispatchChange(open: boolean) {
    dispatchOpenChangeEvent(this, open)
  }

  private _onPointerDown = (e: PointerEvent) => {
    this._clearLongPressFollowUp()
    this._longPressGestureOpenedMenu = false
    this._disarmFollowUpClickAbsorption()
    if (!this.longPress || this.disabled || e.pointerType !== 'touch') return
    this._cancelLongPress()
    this._longPressOrigin = { x: e.clientX, y: e.clientY }
    this._longPressTimer = setTimeout(() => {
      this._longPressTimer = undefined
      const origin = this._longPressOrigin
      if (!origin) return
      this._longPressOrigin = undefined
      if (this._isOpen) return
      this._longPressOpenedAt = performance.now()
      if (this._openAt(origin.x, origin.y, false, true, true)) {
        this._userOpenChange.mark()
        this._longPressGestureOpenedMenu = true
      }
    }, this.longPressDelay)
  }

  private _onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const origin = this._longPressOrigin
    if (!origin) return
    const distance = Math.hypot(e.clientX - origin.x, e.clientY - origin.y)
    if (distance > LONG_PRESS_MOVE_TOLERANCE) this._cancelLongPress()
  }

  private _onPointerUp = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    if (this._longPressOpenedAt !== null && this._longPressGestureEndedAt === null) {
      this._longPressGestureEndedAt = performance.now()
    }
    if (this._longPressGestureOpenedMenu) {
      this._longPressGestureOpenedMenu = false
      this._armFollowUpClickAbsorption()
    }
    this._cancelLongPress()
  }

  private _onPointerCancel = () => {
    this._longPressGestureOpenedMenu = false
    this._cancelLongPress()
  }

  private _cancelLongPress() {
    if (this._longPressTimer !== undefined) {
      clearTimeout(this._longPressTimer)
      this._longPressTimer = undefined
    }
    this._longPressOrigin = undefined
  }

  private _isLongPressFollowUp(): boolean {
    const openedAt = this._longPressOpenedAt
    if (openedAt === null) return false
    const anchor = this._longPressGestureEndedAt ?? openedAt
    if (performance.now() - anchor > LONG_PRESS_FOLLOW_UP_WINDOW_MS) {
      this._clearLongPressFollowUp()
      return false
    }
    return true
  }

  private _clearLongPressFollowUp() {
    this._longPressOpenedAt = null
    this._longPressGestureEndedAt = null
  }

  private _armFollowUpClickAbsorption() {
    if (this._followUpClickAbsorber) return
    const absorber = (event: MouseEvent) => {
      this._disarmFollowUpClickAbsorption()
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    this._followUpClickAbsorber = absorber
    this.addEventListener('click', absorber, true)
  }

  private _disarmFollowUpClickAbsorption() {
    const absorber = this._followUpClickAbsorber
    if (!absorber) return
    this._followUpClickAbsorber = undefined
    this.removeEventListener('click', absorber, true)
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
    if (this._isOpen && !this._session.isEventInside(e)) {
      this._closeFromUser()
    }
  }

  private _cancelSpacePress() {
    if (this._spaceTimer !== undefined) clearTimeout(this._spaceTimer)
    this._spaceTimer = undefined
    this._spaceTarget = undefined
    this._spaceOpened = false
  }

  private _onSpaceFocusOut = () => {
    if (!this._spaceOpened) this._cancelSpacePress()
  }

  private _onWindowBlur = () => {
    this._cancelSpacePress()
  }

  private _onHeldSpaceRepeat = (event: KeyboardEvent) => {
    if (this._spaceOpened && event.key === ' ') {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  }

  private _onSpaceDown = (event: KeyboardEvent) => {
    if (
      this._replayingSpace ||
      this.disabled ||
      this._isOpen ||
      event.key !== ' ' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return
    const path = event.composedPath()
    const target = path[0]
    const scopeTarget = event.target
    if (!(target instanceof HTMLElement) || !(scopeTarget instanceof HTMLElement) || !this.contains(scopeTarget)) return
    if (path.slice(0, path.indexOf(this)).some(node => node instanceof WebUiContextMenu)) return
    const trigger = this.firstElementChild
    if (!trigger?.contains(scopeTarget)) return
    if (
      target.matches(
        'textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"])'
      )
    )
      return
    const interactive = scopeTarget.closest(
      'input, textarea, select, button, a[href], [contenteditable]:not([contenteditable="false"]), [role="button"], [role="checkbox"], [role="textbox"], web-ui-button, web-ui-input, web-ui-textarea, web-ui-checkbox, web-ui-select'
    )
    if (interactive && interactive !== trigger) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.repeat || this._spaceTarget) return
    this._spaceTarget = target
    this._spaceTimer = setTimeout(() => {
      this._spaceTimer = undefined
      if (this._spaceTarget !== target || this.disabled || !target.isConnected) return
      const rect = target.getBoundingClientRect()
      this._spaceOpened = this._openAt(rect.left, rect.bottom, true, false)
      if (this._spaceOpened) this._userOpenChange.mark()
    }, DEFAULT_LONG_PRESS_DELAY)
  }

  private _onSpaceUp = (event: KeyboardEvent) => {
    if (event.key !== ' ' || !this._spaceTarget) return
    const target = this._spaceTarget
    const opened = this._spaceOpened
    this._cancelSpacePress()
    event.preventDefault()
    event.stopImmediatePropagation()
    if (opened || !target.isConnected) return
    this._replayingSpace = true
    const replay = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      composed: true,
      cancelable: true
    })
    target.dispatchEvent(replay)
    const release = new KeyboardEvent('keyup', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      composed: true,
      cancelable: true
    })
    target.dispatchEvent(release)
    this._replayingSpace = false
    if (!replay.defaultPrevented && !release.defaultPrevented) {
      if (
        target.matches(
          'button, input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]'
        )
      ) {
        target.click()
      } else {
        let ancestor: HTMLElement | null = target
        while (ancestor && ancestor !== document.body) {
          const overflow = getComputedStyle(ancestor).overflowY
          if (/(auto|scroll)/.test(overflow) && ancestor.scrollHeight > ancestor.clientHeight) break
          ancestor = ancestor.parentElement
        }
        if (ancestor && ancestor !== document.body) ancestor.scrollBy({ top: ancestor.clientHeight * 0.875 })
        else window.scrollBy({ top: window.innerHeight * 0.875 })
      }
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (this.disabled) return

    if (e.key === 'ContextMenu') {
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

  private _onMenuItemActivation = (e: Event) => {
    const item = getMenuItemFromEvent(e)
    if (!item || item.hasAttribute('disabled') || item.hasAttribute('submenu')) return
    this._menuItemActivationEvent = e
  }

  private _onDocumentKeydown = (e: KeyboardEvent) => {
    if (!this._isOpen) return
    this._session.handleKeydown(e)
  }

  override render() {
    return html`
      <div class="context-menu-anchor">
        <slot @slotchange=${this._onSlotChange}></slot>
      </div>
    `
  }

  private _onSlotChange() {
    this._session.syncHostState()
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
