import { hideOverlayPresence as hidePanelPresence } from '@/shared/overlay/presence'
import { isEventInsideHost } from '@/shared/overlay/trigger-controller'

import { findFocusedMenuItem, focusMenuItem, getEnabledMenuItems } from './menu-tree'

export interface MenuOutsideClickGuard {
  /** 打开动作后调用：吞掉同一帧内随后冒泡到 document 的本次 click。 */
  arm(): void
  isArmed(): boolean
  /** 事件是否发生在宿主 shadow root 或任何已打开 panel 内部。 */
  isInside(event: Event): boolean
  dispose(): void
}

export function createMenuOutsideClickGuard(
  host: HTMLElement,
  isInsideOverlayPanel: (node: Node) => boolean
): MenuOutsideClickGuard {
  let armed = false
  let disarmTimer: ReturnType<typeof setTimeout> | undefined

  const isInside = (event: Event): boolean => {
    if (isEventInsideHost(host, event)) return true
    for (const node of event.composedPath()) {
      if (node instanceof Node && isInsideOverlayPanel(node)) return true
    }
    return false
  }

  return {
    arm() {
      armed = true
      clearTimeout(disarmTimer)
      disarmTimer = setTimeout(() => {
        armed = false
      })
    },
    isArmed: () => armed,
    isInside,
    dispose() {
      clearTimeout(disarmTimer)
      armed = false
    }
  }
}

export interface MenuHoverDelegate {
  getOpenDepth(): number
  getLevelItems(level: number): HTMLElement[]
  getActiveItem(level: number): HTMLElement | undefined
  isSubmenuItem(item: HTMLElement): boolean
  openSubmenu(item: HTMLElement): void
  closeFrom(level: number): void
}

export interface MenuHoverBinder {
  bind(): void
  dispose(): void
}

const SUBMENU_HOVER_DELAY = 200

export function createMenuHoverBinder(delegate: MenuHoverDelegate, itemSelector: string): MenuHoverBinder {
  let openTimer: ReturnType<typeof setTimeout> | undefined
  let cleanupFns: (() => void)[] = []

  function bind() {
    cleanupFns.forEach(fn => fn())
    cleanupFns = []

    const depth = delegate.getOpenDepth()
    for (let level = 0; level <= depth + 1; level++) {
      const items = delegate.getLevelItems(level)
      if (!items.length) continue
      items.forEach(item => {
        if (!item.matches(itemSelector) || item.hasAttribute('disabled')) return
        const handler = (event: PointerEvent) => {
          if (event.pointerType === 'touch') return
          clearTimeout(openTimer)
          if (delegate.isSubmenuItem(item)) {
            if (delegate.getActiveItem(level) !== item) {
              openTimer = setTimeout(() => delegate.openSubmenu(item), SUBMENU_HOVER_DELAY)
            }
          } else if (delegate.getOpenDepth() > level) {
            delegate.closeFrom(level)
          }
        }
        item.addEventListener('pointerenter', handler, { passive: true })
        cleanupFns.push(() => item.removeEventListener('pointerenter', handler))
      })
    }
  }

  return {
    bind,
    dispose() {
      clearTimeout(openTimer)
      cleanupFns.forEach(fn => fn())
      cleanupFns = []
    }
  }
}

export interface MenuKeyboardDelegate {
  getFocusedItem(event?: KeyboardEvent): HTMLElement | undefined
  getLevelOf(item: HTMLElement): number | undefined
  getEnabledItems(level: number): HTMLElement[]
  isSubmenuItem(item: HTMLElement): boolean
  openSubmenuInstant(item: HTMLElement): void
  closeToParent(level: number): HTMLElement | undefined
  closeDeepestOrAll(): void
}

/**
 * 处理 menu 键盘事件；未命中的键原样返回，调用方不做 preventDefault。
 */
export function handleMenuKeyboard(delegate: MenuKeyboardDelegate, e: KeyboardEvent): void {
  const focused = delegate.getFocusedItem(e)
  const level = focused ? delegate.getLevelOf(focused) : undefined
  if (level === undefined) return
  const items = delegate.getEnabledItems(level)
  const currentIndex = focused ? items.indexOf(focused) : -1

  switch (e.key) {
    case 'ArrowDown':
      focusMenuItem(items[(currentIndex + 1 + items.length) % items.length])
      break
    case 'ArrowUp':
      focusMenuItem(items[(currentIndex - 1 + items.length) % items.length])
      break
    case 'Home':
      focusMenuItem(items[0])
      break
    case 'End':
      focusMenuItem(items.at(-1))
      break
    case 'ArrowRight':
      if (focused?.hasAttribute('submenu')) {
        delegate.openSubmenuInstant(focused)
        requestAnimationFrame(() => requestAnimationFrame(() => focusMenuItem(delegate.getEnabledItems(level + 1)[0])))
      }
      break
    case 'ArrowLeft':
      if (level > 0) {
        focusMenuItem(delegate.closeToParent(level))
      }
      break
    case 'Enter':
    case ' ':
      focused?.click()
      break
    default:
      return
  }
  e.preventDefault()
  e.stopPropagation()
}

export function getFocusedMenuItemFromPanels(
  event: KeyboardEvent | undefined,
  panels: Iterable<HTMLElement | undefined>,
  itemSelector: string
): HTMLElement | undefined {
  const eventItem = event
    ?.composedPath()
    .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(itemSelector))
  if (eventItem) return eventItem

  return findFocusedMenuItem(panels)
}

export function getEnabledMenuLevelItems(content: HTMLElement | undefined): HTMLElement[] {
  return content ? getEnabledMenuItems(content) : []
}

export interface ClosingSubmenuStack<C> {
  take(parentItem: HTMLElement): C | undefined
  closeAsync(parentItem: HTMLElement, container: C): void
  restoreAll(): void
  disposeAll(): void
  closing(): C[]
}

export interface ClosingSubmenuStackAdapter<C> {
  getPanel(container: C): HTMLElement
  restoreItems(container: C, parentItem: HTMLElement): void
  dispose(container: C): void
}

export function createClosingSubmenuStack<C>(adapter: ClosingSubmenuStackAdapter<C>): ClosingSubmenuStack<C> {
  const closing = new Map<HTMLElement, C>()

  return {
    take(parentItem) {
      const container = closing.get(parentItem)
      if (container) closing.delete(parentItem)
      return container
    },
    closeAsync(parentItem, container) {
      closing.set(parentItem, container)
      void (async () => {
        if (!(await hidePanelPresence(adapter.getPanel(container)))) return
        if (closing.get(parentItem) !== container) return

        closing.delete(parentItem)
        adapter.restoreItems(container, parentItem)
        adapter.dispose(container)
      })()
    },
    restoreAll() {
      closing.forEach((container, parentItem) => {
        adapter.restoreItems(container, parentItem)
        adapter.dispose(container)
      })
      closing.clear()
    },
    disposeAll() {
      closing.forEach(container => adapter.dispose(container))
      closing.clear()
    },
    closing() {
      return [...closing.values()]
    }
  }
}
