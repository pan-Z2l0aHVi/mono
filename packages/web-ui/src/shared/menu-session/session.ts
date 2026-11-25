import { defineOpenOverlay, type OpenOverlayHandle } from '@/shared/overlay/open-overlay'
import { hideOverlayPresence, showOverlayPresence } from '@/shared/overlay/presence'
import { defineScrollLockLease } from '@/shared/scroll-lock/scroll-lock'

import {
  createClosingSubmenuStack,
  createMenuHoverBinder,
  createMenuOutsideClickGuard,
  getEnabledMenuLevelItems,
  getFocusedMenuItemFromPanels,
  handleMenuKeyboard,
  type MenuHoverDelegate,
  type MenuKeyboardDelegate
} from './interactions'
import {
  captureFrameworkAnchors,
  findFocusedMenuItem,
  focusMenuItem,
  getMenuChildren,
  getMenuItemFromEvent,
  getMovableMenuSubtrees,
  hideNestedMenuChildren,
  MENU_ITEM_SELECTOR,
  moveMenuChildren,
  orderManagedMenuItems,
  reconcileManagedMenuItems,
  restoreFrameworkAnchors,
  returnManagedMenuItemsToSlot,
  type MenuItemAnchors
} from './menu-tree'
import type {
  MenuCloseOptions,
  MenuEventInsideOptions,
  MenuOpenOptions,
  MenuSession,
  MenuSessionOptions,
  MenuSurface
} from './types'

interface SubmenuEntry<TSurface extends MenuSurface> {
  surface: TSurface
  parentItem: HTMLElement
  level: number
  handle?: OpenOverlayHandle
}

function getDeepActiveElement(): HTMLElement | undefined {
  let active: Element | null = document.activeElement
  while (active instanceof HTMLElement) {
    const nested = active.shadowRoot?.activeElement
    if (!(nested instanceof HTMLElement)) return active
    active = nested
  }
  return undefined
}

export function createMenuSession<TSurface extends MenuSurface>(
  options: MenuSessionOptions<TSurface>
): MenuSession<TSurface> {
  const {
    host,
    markerText,
    hiddenSlot,
    surface: surfaceAdapter,
    isScrollLockDisabled,
    getArbitration,
    onRequestClose,
    closeOnLeafClick,
    closeWhenEmptied = false,
    createRootTiming = 'sync',
    hideHostChildren = false,
    observeHost = false,
    preventBackgroundScroll = false,
    manageFocusRestore = false,
    resetTabStopsOnCleanup = false,
    beforeRootCleanup,
    onRootSurfaceChange
  } = options

  let isOpen = false
  let openedWithContent = false
  let root: TSurface | undefined
  let rootHandle: OpenOverlayHandle | null = null
  let rootHandleIsPlaceholder = false
  let restoreFocusTarget: HTMLElement | undefined
  let refreshScheduled = false
  let pendingRefreshInstant = true
  const submenus: SubmenuEntry<TSurface>[] = []
  const level0ItemAnchors: MenuItemAnchors = new Map()
  const scrollLock = defineScrollLockLease().make()

  const overlay = defineOpenOverlay().make({
    requestClose: () => closeDeepestOrAll(),
    isConnected: () => host.isConnected
  })

  const outsideClickGuard = createMenuOutsideClickGuard(host, node => rootHandle?.contains(node) ?? false)

  const closingSubmenus = createClosingSubmenuStack<SubmenuEntry<TSurface>>({
    getPanel: entry => entry.surface.panel,
    restoreItems: (entry, parentItem) => restoreSubmenuItems(entry.surface, parentItem),
    dispose: entry => {
      entry.handle?.release()
      detachPanelListeners(entry.surface.panel)
      surfaceAdapter.disposeSurface(entry.surface, entry.level)
      rebindContentObservers()
    }
  })

  const hoverDelegate: MenuHoverDelegate = {
    getOpenDepth: () => submenus.length,
    getLevelItems: level => getLevelItems(level),
    getActiveItem: level => submenus[level]?.parentItem,
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenu: item => openSubmenu(item, false),
    closeFrom: level => {
      closeSubmenusFrom(level, false)
      hoverBinder.bind()
    }
  }
  const hoverBinder = createMenuHoverBinder(hoverDelegate, MENU_ITEM_SELECTOR)

  const keyboardDelegate: MenuKeyboardDelegate = {
    getFocusedItem: event =>
      getFocusedMenuItemFromPanels(
        event,
        [root?.content, ...submenus.map(entry => entry.surface.content)],
        MENU_ITEM_SELECTOR
      ),
    getLevelOf: item => getItemLevel(item),
    getEnabledItems: level => getEnabledMenuLevelItems(getLevelSurface(level)?.content),
    isSubmenuItem: item => item.hasAttribute('submenu'),
    openSubmenuInstant: item => openSubmenu(item, true),
    closeToParent: level => {
      const parent = submenus[level - 1]?.parentItem
      closeSubmenusFrom(level - 1, false)
      hoverBinder.bind()
      return parent
    },
    closeDeepestOrAll: () => closeDeepestOrAll()
  }

  const contentObserver = new MutationObserver(() => {
    if (isOpen) scheduleRefresh(true)
  })

  function getLevelSurface(level: number): TSurface | undefined {
    return level === 0 ? root : submenus[level - 1]?.surface
  }

  function getLevelItems(level: number): HTMLElement[] {
    const surface = getLevelSurface(level)
    return surface ? getMenuChildren(surface.content) : []
  }

  function getItemLevel(item: HTMLElement): number | undefined {
    if (root?.panel.contains(item)) return 0
    const index = submenus.findIndex(entry => entry.surface.panel.contains(item))
    return index === -1 ? undefined : index + 1
  }

  function syncScrollLock() {
    scrollLock.sync(isOpen && host.isConnected && !isScrollLockDisabled())
  }

  function hideHostItems() {
    if (hideHostChildren) {
      getMenuChildren(host).forEach(child => child.setAttribute('slot', hiddenSlot))
    }
    hideNestedMenuChildren(host, hiddenSlot)
  }

  function rebindContentObservers() {
    contentObserver.disconnect()
    if (!host.isConnected) return
    if (observeHost) {
      contentObserver.observe(host, { childList: true, subtree: true })
    }
    if (!isOpen) return
    if (root) {
      contentObserver.observe(root.content, { childList: true, subtree: true })
    }
    for (const entry of submenus) {
      contentObserver.observe(entry.surface.content, { childList: true, subtree: true })
    }
  }

  function claimRoot(panel: HTMLElement): OpenOverlayHandle {
    rootHandle?.release()
    rootHandle = overlay.claim(panel, getArbitration ? { arbitration: getArbitration() } : undefined)
    rootHandleIsPlaceholder = panel === host
    for (const entry of submenus) {
      entry.handle = rootHandle.adopt(entry.surface.panel)
    }
    for (const entry of closingSubmenus.closing()) {
      entry.handle = rootHandle.adopt(entry.surface.panel)
    }
    return rootHandle
  }

  function ensureRootHandle(): OpenOverlayHandle {
    return rootHandle ?? claimRoot(root?.panel ?? host)
  }

  function onPanelClick(event: MouseEvent) {
    const item = getMenuItemFromEvent(event)
    if (!item || item.hasAttribute('disabled')) return
    if (item.hasAttribute('submenu')) {
      openSubmenu(item, event.detail === 0)
      return
    }
    if (closeOnLeafClick) onRequestClose('leaf-click')
  }

  function onPanelKeydown(event: KeyboardEvent) {
    if (!isOpen || event.key === 'Tab') return
    handleMenuKeyboard(keyboardDelegate, event)
  }

  function attachPanelListeners(panel: HTMLElement) {
    panel.addEventListener('click', onPanelClick)
    panel.addEventListener('keydown', onPanelKeydown)
  }

  function detachPanelListeners(panel: HTMLElement) {
    panel.removeEventListener('click', onPanelClick)
    panel.removeEventListener('keydown', onPanelKeydown)
  }

  function createRootSurface(): TSurface | undefined {
    const created = surfaceAdapter.createRoot()
    if (!created) return undefined
    attachPanelListeners(created.panel)
    root = created
    onRootSurfaceChange?.(created)
    return created
  }

  function restoreSubmenuItems(surface: TSurface, parentItem?: HTMLElement) {
    if (!parentItem) return
    moveMenuChildren(surface.content, parentItem)
    hideNestedMenuChildren(parentItem, hiddenSlot)
  }

  function openSubmenu(item: HTMLElement, isInstant: boolean) {
    if (!isOpen || !item.hasAttribute('submenu') || item.hasAttribute('disabled')) return

    const parentLevel = getItemLevel(item)
    if (parentLevel === undefined || submenus[parentLevel]?.parentItem === item) return

    closeSubmenusFrom(parentLevel, false)

    const reused = closingSubmenus.take(item)
    if (reused) {
      reused.level = parentLevel + 1
      reused.handle?.release()
      reused.handle = ensureRootHandle().adopt(reused.surface.panel)
      submenus[parentLevel] = reused
      item.setAttribute('active', '')
      surfaceAdapter.positionSubmenu(reused.surface, item, reused.level, { isInstant })
      showOverlayPresence(reused.surface.panel, { isInstant })
      rebindContentObservers()
      hoverBinder.bind()
      return
    }

    if (getMenuChildren(item).length === 0) return

    const level = parentLevel + 1
    const created = surfaceAdapter.createSubmenu({ level, parentItem: item })
    if (!created) return

    attachPanelListeners(created.panel)
    moveMenuChildren(item, created.content)
    hideNestedMenuChildren(created.content, hiddenSlot)

    const entry: SubmenuEntry<TSurface> = {
      surface: created,
      parentItem: item,
      level,
      handle: ensureRootHandle().adopt(created.panel)
    }
    submenus[parentLevel] = entry
    item.setAttribute('active', '')
    surfaceAdapter.positionSubmenu(created, item, level, { isInstant })
    showOverlayPresence(created.panel, { isInstant })
    rebindContentObservers()
    hoverBinder.bind()
  }

  function closeSubmenusFrom(indexFrom: number, isInstant: boolean) {
    for (let index = submenus.length - 1; index >= indexFrom; index--) {
      const entry = submenus[index]
      entry.parentItem.removeAttribute('active')
      if (isInstant) {
        entry.handle?.release()
        restoreSubmenuItems(entry.surface, entry.parentItem)
        detachPanelListeners(entry.surface.panel)
        surfaceAdapter.disposeSurface(entry.surface, entry.level)
      } else {
        closingSubmenus.closeAsync(entry.parentItem, entry)
      }
    }
    submenus.length = indexFrom
    if (isInstant) rebindContentObservers()
  }

  function closeDeepestOrAll() {
    if (submenus.length > 0) {
      const lastIndex = submenus.length - 1
      const parent = submenus[lastIndex]?.parentItem
      closeSubmenusFrom(lastIndex, false)
      focusMenuItem(parent)
      hoverBinder.bind()
    } else {
      onRequestClose('escape')
    }
  }

  function hasContent(): boolean {
    const container = root?.content ?? host
    return getMovableMenuSubtrees(container).some(subtree => !subtree.hasAttribute('hidden'))
  }

  function checkCloseWhenEmptied() {
    if (!closeWhenEmptied) return
    if (!isOpen) {
      openedWithContent = false
      return
    }
    if (hasContent()) {
      openedWithContent = true
      return
    }
    if (openedWithContent) {
      onRequestClose('emptied')
    }
  }

  function reconcileContent() {
    if (!root) return
    const content = root.content
    reconcileManagedMenuItems(host, content, level0ItemAnchors, markerText)
    hideHostItems()
    hideNestedMenuChildren(content, hiddenSlot)
    const frameworkAnchors = captureFrameworkAnchors(content, markerText)
    orderManagedMenuItems(host, content, level0ItemAnchors, markerText)
    restoreFrameworkAnchors(content, frameworkAnchors)

    for (const entry of submenus) {
      moveMenuChildren(entry.parentItem, entry.surface.content)
      hideNestedMenuChildren(entry.surface.content, hiddenSlot)
    }
  }

  function scheduleRefresh(isInstant = true) {
    pendingRefreshInstant = isInstant
    if (refreshScheduled || !isOpen) return
    refreshScheduled = true
    requestAnimationFrame(() => {
      refreshScheduled = false
      if (!isOpen || !root) return
      reconcileContent()
      surfaceAdapter.positionRoot(root, { isInstant: pendingRefreshInstant })
      hoverBinder.bind()
      checkCloseWhenEmptied()
    })
  }

  function focusFirstItem(attempt: number, maxAttempts: number, suppressFocusVisible: boolean) {
    const firstItem = getEnabledMenuLevelItems(root?.content)[0]
    if (!firstItem) return
    focusMenuItem(firstItem, { suppressFocusVisible })
    if (attempt + 1 >= maxAttempts) return
    if (findFocusedMenuItem([root?.panel])) return
    requestAnimationFrame(() => {
      if (!isOpen || !root) return
      focusFirstItem(attempt + 1, maxAttempts, suppressFocusVisible)
    })
  }

  function resetMenuTabStops() {
    host.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR).forEach(item => {
      const control = item.shadowRoot?.querySelector<HTMLElement>('[role="menuitem"]')
      if (control) control.tabIndex = item.hasAttribute('disabled') ? -1 : 0
    })
  }

  function cleanupClosedMenu() {
    closeSubmenusFrom(0, true)
    closingSubmenus.restoreAll()
    if (root) {
      returnManagedMenuItemsToSlot(host, root.content, level0ItemAnchors)
      if (resetTabStopsOnCleanup) resetMenuTabStops()
      detachPanelListeners(root.panel)
      const current = root
      root = undefined
      surfaceAdapter.disposeSurface(current, 0)
      onRootSurfaceChange?.(undefined)
    } else if (resetTabStopsOnCleanup) {
      resetMenuTabStops()
    }
    rebindContentObservers()
  }

  async function closeRootAfterPresence(closeOptions?: MenuCloseOptions) {
    const currentRoot = root
    const instant = closeOptions?.isInstant ?? (closeWhenEmptied ? !hasContent() : false)
    if (currentRoot && !(await hideOverlayPresence(currentRoot.panel, { isInstant: instant }))) return
    if (isOpen || !host.isConnected || root !== currentRoot) return

    const shouldRestoreFocus = Boolean(manageFocusRestore && !closeOptions?.skipFocusRestore && hasFocusWithin())
    if (currentRoot) beforeRootCleanup?.(currentRoot)
    cleanupClosedMenu()
    if (shouldRestoreFocus) (closeOptions?.restoreFocusTo ?? restoreFocusTarget)?.focus()
    restoreFocusTarget = undefined
  }

  function hasFocusWithin(): boolean {
    if (rootHandle?.hasFocusWithin()) return true
    const panels = [
      root?.panel,
      ...submenus.map(entry => entry.surface.panel),
      ...closingSubmenus.closing().map(entry => entry.surface.panel)
    ]
    return panels.some(panel => Boolean(panel?.matches(':focus-within')))
  }

  const onBackgroundScroll = (event: Event) => {
    if (!isOpen || isScrollLockDisabled()) return
    if (rootHandle?.containsEvent(event)) return
    event.preventDefault()
  }

  return {
    open(openOptions: MenuOpenOptions) {
      outsideClickGuard.arm()
      if (isOpen) {
        closeSubmenusFrom(0, true)
        closingSubmenus.restoreAll()
        scheduleRefresh(openOptions.isInstant)
        return
      }

      isOpen = true
      openedWithContent = hasContent()
      if (manageFocusRestore) {
        restoreFocusTarget ??= getDeepActiveElement()
      }
      syncScrollLock()
      hideHostItems()

      if (createRootTiming === 'sync') {
        if (!root) createRootSurface()
        if (root && (!rootHandle || rootHandleIsPlaceholder)) {
          claimRoot(root.panel)
        }
        rebindContentObservers()
      }

      overlay.invalidate()
      overlay.scheduleFrame(() => {
        if (!isOpen) return
        if (!root) {
          if (!createRootSurface()) return
        }
        if (root && (!rootHandle || rootHandleIsPlaceholder)) {
          claimRoot(root.panel)
        }
        if (!root) return
        rebindContentObservers()
        reconcileContent()
        surfaceAdapter.positionRoot(root, { isInstant: openOptions.isInstant })
        showOverlayPresence(root.panel, { isInstant: openOptions.isInstant })
        hoverBinder.bind()
        checkCloseWhenEmptied()

        if (openOptions.takeFocus) {
          const attempts = openOptions.focusRetryAttempts ?? 1
          if (openOptions.deferFocusFrame) {
            requestAnimationFrame(() => {
              if (!isOpen || !root) return
              focusFirstItem(0, attempts, openOptions.suppressFocusVisible)
            })
          } else {
            focusFirstItem(0, attempts, openOptions.suppressFocusVisible)
          }
        }
      })
    },

    close(closeOptions?: MenuCloseOptions) {
      isOpen = false
      openedWithContent = false
      syncScrollLock()
      rootHandle?.release()
      rootHandle = null
      rootHandleIsPlaceholder = false
      overlay.invalidate()
      refreshScheduled = false
      rebindContentObservers()
      void closeRootAfterPresence(closeOptions)
    },

    claimPlaceholder() {
      claimRoot(root?.panel ?? host)
    },

    syncHostState() {
      syncScrollLock()
      if (getArbitration) rootHandle?.setArbitration(getArbitration())
      hideHostItems()
      if (isOpen) scheduleRefresh(true)
      checkCloseWhenEmptied()
    },

    handleKeydown(event: KeyboardEvent) {
      if (!isOpen || event.key === 'Tab') return
      handleMenuKeyboard(keyboardDelegate, event)
    },

    isEventInside(event: Event, insideOptions?: MenuEventInsideOptions): boolean {
      if (insideOptions?.respectOpenArm && outsideClickGuard.isArmed()) return true
      if (insideOptions?.includeHost === false) {
        return rootHandle?.containsEvent(event) ?? false
      }
      return outsideClickGuard.isInside(event)
    },

    hasContent,

    getRootSurface() {
      return root
    },

    hasFocusWithin,

    connect() {
      overlay.resume()
      hideHostItems()
      if (closeOnLeafClick) host.addEventListener('click', onPanelClick)
      if (preventBackgroundScroll) {
        document.addEventListener('wheel', onBackgroundScroll, { capture: true, passive: false })
        document.addEventListener('touchmove', onBackgroundScroll, { capture: true, passive: false })
      }
      rebindContentObservers()
    },

    disconnect() {
      contentObserver.disconnect()
      if (closeOnLeafClick) host.removeEventListener('click', onPanelClick)
      if (preventBackgroundScroll) {
        document.removeEventListener('wheel', onBackgroundScroll, true)
        document.removeEventListener('touchmove', onBackgroundScroll, true)
      }
      outsideClickGuard.dispose()
      hoverBinder.dispose()
      overlay.suspend()
      scrollLock.release()
      rootHandle?.release()
      rootHandle = null
      rootHandleIsPlaceholder = false
      isOpen = false
      openedWithContent = false
      refreshScheduled = false
      restoreFocusTarget = undefined
      cleanupClosedMenu()
    }
  }
}
