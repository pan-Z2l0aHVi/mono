/**
 * 菜单行为层：dropdown 与 context-menu 共用的交互行为。
 *
 * 结构层（面板构建、迁移、定位）由 menu-portal/menu-tree 与各组件自己承载；
 * 这里只收口四种在两个组件中逐行复制的行为：
 * 1. outside-click 守卫（同帧吞掉打开点击 + composedPath 内含判定）
 * 2. 层级 hover 绑定（200ms 打开计时、touch 守卫、hover 收起更深层级）
 * 3. roving 键盘导航（Arrow/Home/End/Enter/Space/Escape）
 * 4. 关闭中的 submenu presence 收尾栈（动画结束后归还子项并销毁面板）
 *
 * 组件是 adapter：提供层级容器/项的查询与打开/关闭原语，行为由此驱动。
 */
import { findFocusedMenuItem, focusMenuItem, getEnabledMenuItems } from '@/shared/menu-portal/menu-tree'
import { hideOverlayPresence as hidePanelPresence } from '@/shared/overlay/presence'

/** 菜单层级面板的最小视图：行为层只需要面板（presence/contains）与内容容器（项查询）。 */
export interface MenuLevelSurface {
  panel: HTMLElement
  content: HTMLElement
}

/* ------------------------------------------------------------------ *
 * Outside-click 守卫
 * ------------------------------------------------------------------ */

export interface MenuOutsideClickGuard {
  /** 打开动作后调用：吞掉同一帧内随后冒泡到 document 的本次 click。 */
  arm(): void
  isArmed(): boolean
  /** 事件是否发生在宿主 shadow root 或任何已打开面板内部。 */
  isInside(event: MouseEvent): boolean
  dispose(): void
}

export function createMenuOutsideClickGuard(
  host: HTMLElement,
  isInsideOverlayPanel: (node: Node) => boolean
): MenuOutsideClickGuard {
  let armed = false
  let disarmTimer: ReturnType<typeof setTimeout> | undefined

  const isInside = (event: MouseEvent): boolean => {
    for (const node of event.composedPath()) {
      if (node === host || node === host.shadowRoot) return true
      if (node instanceof Node && node.getRootNode() === host.shadowRoot) return true
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

/* ------------------------------------------------------------------ *
 * 层级 hover 绑定
 * ------------------------------------------------------------------ */

export interface MenuHoverDelegate {
  /** 当前展开的 submenu 深度；行为层会绑定 0..depth+1 每一层。 */
  getOpenDepth(): number
  getLevelItems(level: number): HTMLElement[]
  /** 该层当前激活（子面板已展开）的项；用于避免重复打开。 */
  getActiveItem(level: number): HTMLElement | undefined
  isSubmenuItem(item: HTMLElement): boolean
  /** hover 到 submenu 项且它不是当前激活项。 */
  openSubmenu(item: HTMLElement): void
  /** hover 到叶子项且存在更深层级：关闭比它深的子面板（内部自行重新 bind）。 */
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

/* ------------------------------------------------------------------ *
 * roving 键盘导航
 * ------------------------------------------------------------------ */

export interface MenuKeyboardDelegate {
  getFocusedItem(event?: KeyboardEvent): HTMLElement | undefined
  /** 焦点项所在层级；不在任何面板内时返回 undefined。 */
  getLevelOf(item: HTMLElement): number | undefined
  getEnabledItems(level: number): HTMLElement[]
  isSubmenuItem(item: HTMLElement): boolean
  /** 键盘 ArrowRight：以 instant 语义打开该项的子面板。 */
  openSubmenuInstant(item: HTMLElement): void
  /** 键盘 ArrowLeft：关闭 level 层子面板并返回其父项。 */
  closeToParent(level: number): HTMLElement | undefined
  /** Escape：关闭最深一层子面板；没有子面板时关闭整个菜单。 */
  closeDeepestOrAll(): void
}

/**
 * 处理菜单键盘事件；未命中的键原样返回，调用方不做 preventDefault。
 * 事件监听的挂载位置（宿主 / 面板 / document）由组件自己决定。
 */
export function handleMenuKeyboard(delegate: MenuKeyboardDelegate, e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    delegate.closeDeepestOrAll()
    e.preventDefault()
    return
  }

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
        // 双 rAF：等子面板构建/迁移完成后再聚焦其第一个可用项
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

/** 供 getFocusedItem 实现：优先取事件 composedPath 上的菜单项，其次查找面板内已聚焦项。 */
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

/** 供 getEnabledItems 实现：从层级 content 查询可用项。 */
export function getEnabledMenuLevelItems(content: HTMLElement | undefined): HTMLElement[] {
  return content ? getEnabledMenuItems(content) : []
}

/* ------------------------------------------------------------------ *
 * 关闭中的 submenu presence 收尾栈
 * ------------------------------------------------------------------ */

export interface ClosingSubmenuStack<C> {
  /** 取出正在关闭的容器以复用（同帧关闭→重开同一父项）。 */
  take(parentItem: HTMLElement): C | undefined
  /** 挂起关闭：等出场动画结束后归还子项并销毁面板。 */
  closeAsync(parentItem: HTMLElement, container: C): void
  /** 立即归还并销毁全部关闭中的容器（整菜单关闭 / 重开路径）。 */
  restoreAll(): void
  /** 全部强制销毁（断开连接时），不再归还子项。 */
  disposeAll(): void
}

export interface ClosingSubmenuStackAdapter<C> {
  getPanel(container: C): HTMLElement
  /** 归子项回父项（moveMenuChildren 与隐藏补丁由 adapter 决定）。 */
  restoreItems(container: C, parentItem: HTMLElement): void
  /** 销毁面板（remove + overlay api.dispose 等）。 */
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
      // 先登记再等出场动画：同帧关闭→重开时 take() 会从这里取走复用
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
    }
  }
}
