import type { Placement } from '@floating-ui/dom'
import { html, LitElement, unsafeCSS } from 'lit'
import { customElement, property } from 'lit/decorators.js'

import {
  createMenuPortalOverlay,
  createMenuSession,
  getDeepActiveElement,
  getMenuItemFromEvent,
  type MenuSurface
} from '@/shared/menu-session'
import { normalizeLiteral, normalizeNumber } from '@/shared/normalize'
import { dispatchOpenChangeEvent } from '@/shared/open-state'
import { defineOverlay, type OverlayApi } from '@/shared/overlay/overlay'
import { FLOATING_PLACEMENTS } from '@/shared/overlay/placement-props'
import { defineTriggerController } from '@/shared/overlay/trigger-controller'
import { defineOverlayDelayProps } from '@/shared/overlay/trigger-delay-props'
import { hasTriggerGesture, isTriggerNone, normalizeTriggerSet } from '@/shared/overlay/trigger-props'

import style from './style.css?inline'

export type { Placement }

const SLOT_PREFIX = 'web-ui-menu-level-'
const DEFAULT_TRIGGERS = ['click'] as const
const MENU_ITEM_MARKER = 'wui-dropdown-menu-item'

function getComposedParent(node: Node): Node | null {
  if (node instanceof Element && node.assignedSlot) return node.assignedSlot
  return node.parentNode instanceof ShadowRoot ? node.parentNode.host : node.parentNode
}

function isComposedDescendant(node: Node, ancestor: Node): boolean {
  let current: Node | null = node
  while (current) {
    if (current === ancestor) return true
    current = getComposedParent(current)
  }
  return false
}

function hasNativeModalAncestor(node: Node): boolean {
  let current: Node | null = node
  while (current) {
    if (current instanceof HTMLDialogElement && current.open && current.matches(':modal')) return true
    current = getComposedParent(current)
  }
  return false
}

let dropdownIdCounter = 0

interface DropdownMenuSurface extends MenuSurface {
  api: OverlayApi
  unbindKeepAlive: () => void
}

type PointerInteraction = {
  startedInsideMenu: boolean
  startedWithinDropdown: boolean
  completed: boolean
  clickInsideMenu?: boolean
}

@customElement('web-ui-dropdown')
export class WebUiDropdown extends defineOverlayDelayProps(LitElement) {
  static override styles = unsafeCSS(style)

  @property({ type: Boolean, reflect: true })
  get open(): boolean {
    return this._openValue
  }
  set open(v: boolean) {
    this._triggerController.applyDeclarativeOpen(Boolean(v))
  }
  private _openValue = false
  @property({ type: Boolean, reflect: true }) disabled = false
  @property({ type: Boolean, reflect: true, attribute: 'match-width' }) matchWidth = false
  @property({ type: Boolean, reflect: true, attribute: 'no-scroll-lock' }) noScrollLock = false

  @property({ type: String, reflect: true })
  get trigger(): string {
    return this._triggerValue
  }
  set trigger(v: string) {
    const old = this._triggerValue
    this._triggerValue = normalizeTriggerSet(v, DEFAULT_TRIGGERS)
    this.requestUpdate('trigger', old)
  }
  private _triggerValue: string = DEFAULT_TRIGGERS.join(',')

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

  private readonly _surfaces = new Set<DropdownMenuSurface>()
  private _takeFocusOnOpen = true
  private _pendingNotify: boolean | undefined
  private _skipFocusRestoreOnClose = false
  private _pointerInteraction?: PointerInteraction
  private _pendingFocusOutCheck?: () => void
  private _focusOutGeneration = 0
  private _pendingTabNavigation?: {
    event: KeyboardEvent
    focusedItem: HTMLElement
    previousFocus?: HTMLElement
    focusTrigger: boolean
  }
  private _shouldOpenInstantly = true
  private _suppressInitialFocusVisible = true

  private readonly _triggerController = defineTriggerController({
    host: this,
    getTrigger: () => this.trigger,
    canOpen: () => !this.disabled,
    getOpen: () => this._openValue,
    hoverOpensInstantly: () => false,
    getPanelHandle: () =>
      this._openValue
        ? {
            containsEvent: event => this._session.isEventInside(event, { includeHost: false }),
            hasFocusWithin: () => this._session.hasFocusWithin()
          }
        : null,
    outsideClick: false,
    focusOut: false,
    requestOpen: meta =>
      this._openMenu({
        isInstant: meta.instant,
        notify: meta.notify,
        suppressFocusVisible: meta.source === 'imperative' ? true : !meta.instant,
        takeFocus: meta.source !== 'hover',
        automatic: meta.automatic
      }),
    requestClose: meta => this._closeAll(meta.notify)
  })

  private readonly _session = createMenuSession<DropdownMenuSurface>({
    host: this,
    markerText: MENU_ITEM_MARKER,
    hiddenSlot: `${SLOT_PREFIX}-hidden`,
    createRootTiming: 'frame',
    observeHost: true,
    closeOnLeafClick: false,
    closeWhenEmptied: true,
    manageFocusRestore: true,
    resetTabStopsOnCleanup: true,
    isScrollLockDisabled: () => this.noScrollLock,
    getArbitration: () => this._triggerController.arbitration(),
    onRequestClose: () => {
      this._closeAll(true)
    },
    onRootSurfaceChange: () => {
      this._syncTriggerAria()
    },
    surface: {
      createRoot: () => {
        const anchor = this._queryTriggerAnchor()
        if (!anchor) return undefined
        const { panel, content } = createMenuPortalOverlay('dropdown-overlay', this)
        panel.setAttribute('role', 'menu')
        panel.id = `wui-dropdown-menu-${++dropdownIdCounter}`
        panel.dataset.level = '0'
        const api = defineOverlay().make({
          anchor,
          overlay: panel,
          placement: this.placement,
          offset: this.offset,
          minAnchorWidth: true,
          matchWidth: this.matchWidth,
          strategy: 'fixed'
        })
        const surface: DropdownMenuSurface = {
          panel,
          content,
          api,
          unbindKeepAlive: this._triggerController.bindPanelKeepAlive(panel)
        }
        this._surfaces.add(surface)
        return surface
      },
      createSubmenu: ({ level, parentItem }) => {
        const anchor = parentItem.shadowRoot?.querySelector<HTMLElement>('.item-inner') ?? parentItem
        const { panel, content } = createMenuPortalOverlay('dropdown-overlay', this)
        panel.setAttribute('role', 'menu')
        panel.dataset.level = String(level)
        const api = defineOverlay().make({
          anchor,
          overlay: panel,
          placement: 'right-start',
          offset: 0,
          minAnchorWidth: true,
          matchWidth: false,
          strategy: 'fixed'
        })
        const surface: DropdownMenuSurface = {
          panel,
          content,
          api,
          unbindKeepAlive: this._triggerController.bindPanelKeepAlive(panel)
        }
        this._surfaces.add(surface)
        return surface
      },
      positionRoot: surface => {
        surface.api.open()
      },
      positionSubmenu: surface => {
        surface.api.open()
      },
      disposeSurface: surface => {
        this._surfaces.delete(surface)
        surface.unbindKeepAlive()
        surface.panel.remove()
        surface.api.dispose()
      }
    }
  })

  get isOpen(): boolean {
    return this.open
  }

  override connectedCallback() {
    super.connectedCallback()
    this._session.connect()
    this._triggerController.connect()
    this.addEventListener('keydown', this._onKeydown)
    window.addEventListener('keydown', this._onTabKeydown)
    document.addEventListener('pointerdown', this._onPointerDown, true)
    document.addEventListener('pointerup', this._onPointerUp, true)
    document.addEventListener('pointercancel', this._onPointerCancel, true)
    document.addEventListener('click', this._onClickOutside)
    document.addEventListener('focusin', this._onFocusIn, true)
    document.addEventListener('focusout', this._onFocusOut, true)
    if (this.open && this.hasUpdated) this._syncOpenOverlay(this._isFocusOrphaned())
  }

  override firstUpdated() {
    this.shadowRoot
      ?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
      ?.addEventListener('slotchange', () => this.requestUpdate())
  }

  override disconnectedCallback() {
    super.disconnectedCallback()
    this._triggerController.disconnect()
    this._pointerInteraction = undefined
    this._pendingFocusOutCheck = undefined
    this._focusOutGeneration++
    this._pendingTabNavigation = undefined
    this.removeEventListener('keydown', this._onKeydown)
    window.removeEventListener('keydown', this._onTabKeydown)
    document.removeEventListener('pointerdown', this._onPointerDown, true)
    document.removeEventListener('pointerup', this._onPointerUp, true)
    document.removeEventListener('pointercancel', this._onPointerCancel, true)
    document.removeEventListener('click', this._onClickOutside)
    document.removeEventListener('focusin', this._onFocusIn, true)
    document.removeEventListener('focusout', this._onFocusOut, true)
    this._session.disconnect()
  }

  protected override updated(changed: Map<string, unknown>) {
    this._syncTriggerAria()

    if (changed.has('open')) {
      if (this.open) {
        this._skipFocusRestoreOnClose = false
        this._syncOpenOverlay(true)
      } else {
        this._focusOutGeneration++
        this._suppressInitialFocusVisible = true
        const skipFocusRestore = this._skipFocusRestoreOnClose
        this._skipFocusRestoreOnClose = false
        this._session.close({ skipFocusRestore })
      }
      const notify = this._pendingNotify
      this._pendingNotify = undefined
      if (notify) dispatchOpenChangeEvent(this, this.open)
    }
    if (changed.has('trigger')) {
      this._triggerController.syncTriggerChange()
      this._session.syncHostState()
    }
    if (changed.has('noScrollLock')) this._session.syncHostState()
    if (changed.has('placement') || changed.has('offset') || changed.has('matchWidth')) {
      this._session.getRootSurface()?.api.update({
        placement: this.placement,
        offset: this.offset,
        matchWidth: this.matchWidth
      })
    }
  }

  private _isFocusOrphaned(): boolean {
    const active = document.activeElement
    return active === null || active === document.body || active === document.documentElement
  }

  private _syncOpenOverlay(takeFocus: boolean) {
    const focusFirst = takeFocus && this._takeFocusOnOpen
    const isInstant = this._shouldOpenInstantly
    const suppressFocusVisible = this._suppressInitialFocusVisible
    this._takeFocusOnOpen = true
    this._shouldOpenInstantly = true
    this._session.open({
      isInstant,
      takeFocus: focusFirst,
      suppressFocusVisible
    })
  }

  /** 命令式打开：派发 `open-change`。`none` 下同样可用。 */
  show(options?: { instant?: boolean }): void {
    this._triggerController.show(options)
  }

  /** 命令式收起全部层级：派发 `open-change`。 */
  hide(options?: { instant?: boolean }): void {
    this._triggerController.hide(options)
  }

  toggle(options?: { instant?: boolean }): void {
    this._triggerController.toggle(options)
  }

  private _openMenu(options: {
    isInstant: boolean
    notify: boolean
    suppressFocusVisible: boolean
    takeFocus: boolean
    automatic: boolean
  }) {
    if (this.disabled || this._openValue) return
    const hasContent = this._session.hasContent()
    if (options.automatic && !hasContent) return
    this._shouldOpenInstantly = options.isInstant
    this._suppressInitialFocusVisible = options.suppressFocusVisible
    this._takeFocusOnOpen = options.takeFocus
    // panel 要等一帧才建好，而 Escape 可能在这之前到达：先用宿主占位 claim。
    this._session.claimPlaceholder()
    this._applyOpen(options.notify)
  }

  private _applyOpen(notify: boolean) {
    if (this._openValue) return
    this._openValue = true
    this._pendingNotify = notify
    this.requestUpdate('open', false)
  }

  private _applyClose(notify: boolean) {
    if (!this._openValue) return
    this._openValue = false
    this._pendingNotify = notify
    this.requestUpdate('open', true)
  }

  private _closeAll(notify: boolean) {
    if (!this._openValue) return
    this._applyClose(notify)
  }

  private _queryTriggerAnchor(): HTMLElement | null {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="trigger"]')
    const el = slot?.assignedElements()[0]
    return el instanceof HTMLElement ? el : null
  }

  private _focusTriggerForTab() {
    const trigger = this._queryTriggerAnchor()
    if (!trigger) return
    trigger.focus()
    const active = getDeepActiveElement()
    if (active && isComposedDescendant(active, trigger)) return

    const control = trigger.shadowRoot?.querySelector<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'
    )
    control?.focus()
  }

  private _syncTriggerAria() {
    const trigger = this._queryTriggerAnchor()
    if (!trigger) return
    trigger.setAttribute('aria-haspopup', 'menu')
    trigger.setAttribute('aria-expanded', String(this.open))
    const rootOverlay = this._session.getRootSurface()?.panel
    if (rootOverlay?.id) trigger.setAttribute('aria-controls', rootOverlay.id)
    else trigger.removeAttribute('aria-controls')
  }

  private _onClickOutside = (e: MouseEvent) => {
    if (this._pointerInteraction) {
      this._pointerInteraction.completed = true
      this._pointerInteraction.clickInsideMenu = this._session.isEventInside(e)
      this._pointerInteraction = undefined
      this._resumePendingFocusOutCheck()
    }
    if (!hasTriggerGesture(this.trigger, 'click')) return
    if (!this.isOpen || this._session.isEventInside(e, { respectOpenArm: true })) return
    this._closeAll(true)
  }

  private _onPointerDown = (event: PointerEvent) => {
    const startedInsideMenu = Boolean(this.open && this._session.isEventInside(event, { includeHost: false }))
    this._pointerInteraction = {
      startedInsideMenu,
      startedWithinDropdown: Boolean(this.open && (startedInsideMenu || event.composedPath().includes(this))),
      completed: false
    }
  }

  private _onPointerUp = (event: PointerEvent) => {
    const interaction = this._pointerInteraction
    if (!interaction) return
    interaction.completed = true
    interaction.clickInsideMenu = Boolean(this._session.isEventInside(event, { includeHost: false }))
    this._pointerInteraction = undefined
    this._resumePendingFocusOutCheck()
  }

  private _onPointerCancel = () => {
    const interaction = this._pointerInteraction
    if (!interaction) return
    interaction.completed = true
    interaction.clickInsideMenu = interaction.startedInsideMenu
    this._pointerInteraction = undefined
    this._resumePendingFocusOutCheck()
  }

  private _resumePendingFocusOutCheck() {
    const check = this._pendingFocusOutCheck
    this._pendingFocusOutCheck = undefined
    check?.()
  }

  private _onFocusOut = (event: FocusEvent) => {
    if (!hasTriggerGesture(this.trigger, 'focus')) return
    if (!this.open || !this._session.isEventInside(event, { includeHost: false })) return
    const pointerInteraction = this._pointerInteraction
    const source = event.composedPath()[0]
    if (source instanceof Node && !source.isConnected) return
    const next = event.relatedTarget
    if (next instanceof Node && [...this._surfaces].some(({ panel }) => isComposedDescendant(next, panel))) {
      return
    }
    const movedToKnownOutsideTarget = next instanceof Node
    if (movedToKnownOutsideTarget) this._skipFocusRestoreOnClose = true

    const generation = this._focusOutGeneration
    const checkFocus = () => {
      if (!this.open || this._focusOutGeneration !== generation || !hasTriggerGesture(this.trigger, 'focus')) return
      if (this._pendingTabNavigation) {
        this._pendingFocusOutCheck = () => requestAnimationFrame(checkFocus)
        return
      }
      if (pointerInteraction?.startedWithinDropdown) {
        if (!pointerInteraction.completed) {
          this._pendingFocusOutCheck = () => requestAnimationFrame(checkFocus)
          return
        }
        if (pointerInteraction.clickInsideMenu) return
      }
      if (this._session.hasFocusWithin()) {
        if (movedToKnownOutsideTarget) this._skipFocusRestoreOnClose = false
        return
      }
      this._skipFocusRestoreOnClose = true
      this._closeAll(true)
    }
    requestAnimationFrame(checkFocus)
  }

  private _onFocusIn = (event: FocusEvent) => {
    if (!this.open || !this._session.getRootSurface()) return
    if (!this._session.isEventInside(event, { includeHost: false })) {
      if (this._pendingTabNavigation) return
      if (this._pointerInteraction?.startedWithinDropdown && !this._pointerInteraction.completed) return
      if (!hasTriggerGesture(this.trigger, 'focus')) return
      this._skipFocusRestoreOnClose = true
      this._closeAll(true)
      return
    }
    this._skipFocusRestoreOnClose = false
    const focusedItem = getMenuItemFromEvent(event)
    if (!focusedItem) return

    this._setMenuTabStop(focusedItem)
  }

  private _setMenuTabStop(focusedItem?: HTMLElement) {
    for (const { content } of this._surfaces) {
      content.querySelectorAll<HTMLElement>('web-ui-dropdown-item').forEach(item => {
        const control = item.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
        if (control) control.tabIndex = item === focusedItem && !item.hasAttribute('disabled') ? 0 : -1
      })
    }
  }

  private _onKeydown = (e: KeyboardEvent) => {
    if (!this.open || e.key === 'Tab' || this.disabled) return
    this._session.handleKeydown(e)
  }

  private _onTabKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !this.open || e.defaultPrevented) return
    const focusedItem = getMenuItemFromEvent(e)
    if (!focusedItem || ![...this._surfaces].some(({ panel }) => panel.contains(focusedItem))) return

    const isInsideNativeModal = [...this._surfaces].some(({ panel }) => hasNativeModalAncestor(panel))
    const navigation = {
      event: e,
      focusedItem,
      previousFocus:
        focusedItem.shadowRoot?.activeElement instanceof HTMLElement
          ? focusedItem.shadowRoot.activeElement
          : getDeepActiveElement(),
      focusTrigger: !isInsideNativeModal || !e.shiftKey
    }
    this._pendingTabNavigation = navigation
    this._setMenuTabStop()
    if (navigation.focusTrigger) this._focusTriggerForTab()

    setTimeout(() => {
      if (this._pendingTabNavigation !== navigation) return
      this._pendingTabNavigation = undefined

      if (e.defaultPrevented) {
        this._setMenuTabStop(focusedItem)
        if (navigation.previousFocus?.isConnected && getDeepActiveElement() !== navigation.previousFocus) {
          navigation.previousFocus.focus()
        }
        return
      }

      if (!isTriggerNone(this.trigger) && (navigation.focusTrigger || !this._session.hasFocusWithin())) {
        this._skipFocusRestoreOnClose = true
        this._closeAll(true)
      } else {
        this._setMenuTabStop(focusedItem)
      }
    }, 0)
  }

  override render() {
    return html`
      <div class="dropdown-trigger" @click=${this._triggerController.handleTriggerClick}>
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
