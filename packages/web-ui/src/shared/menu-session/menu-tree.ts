export const MENU_CONTENT_SELECTOR = 'web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header'
export const MENU_ITEM_SELECTOR = 'web-ui-dropdown-item'

export function getMenuChildren(container: ParentNode): HTMLElement[] {
  const children: HTMLElement[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.matches(MENU_CONTENT_SELECTOR)) {
      children.push(child)
      continue
    }

    // 框架条件渲染会用元素包裹自有节点，或留下注释锚点。搜索 wrapper，
    // 但不进入 menu item 内部；其子节点属于嵌套 submenu。
    children.push(...getMenuChildren(child))
  }
  return children
}

export function getEnabledMenuItems(container: ParentNode): HTMLElement[] {
  return getMenuChildren(container).filter(item => item.matches(`${MENU_ITEM_SELECTOR}:not([disabled])`))
}

export function getMovableMenuSubtrees(container: ParentNode): HTMLElement[] {
  const subtrees: HTMLElement[] = []
  for (const child of Array.from(container.children)) {
    if (!(child instanceof HTMLElement)) continue
    if (child.matches(MENU_CONTENT_SELECTOR) || getMenuChildren(child).length > 0) subtrees.push(child)
  }
  return subtrees
}

export function moveMenuChildren(source: ParentNode, target: HTMLElement) {
  getMovableMenuSubtrees(source).forEach(subtree => {
    // 正常调用 source !== target，移走后项不再属于 source，天然收敛；
    // 这里兜底防御 source === target 的误用，避免 appendChild 自移动触发观察者刷新循环。
    if (subtree.parentNode === target) return
    target.appendChild(subtree)
  })
}

export function hideNestedMenuChildren(root: ParentNode, slot: string) {
  root.querySelectorAll<HTMLElement>('web-ui-dropdown-item[submenu]').forEach(item => {
    getMenuChildren(item).forEach(child => child.setAttribute('slot', slot))
  })
}

export function getMenuItemFromEvent(event: Event): HTMLElement | null {
  return (
    event
      .composedPath()
      .find((node): node is HTMLElement => node instanceof HTMLElement && node.matches(MENU_ITEM_SELECTOR)) ?? null
  )
}

export interface MenuItemFocusOptions {
  /** 初始打开时的程序化聚焦不应绘制键盘焦点视觉。 */
  suppressFocusVisible?: boolean
}

export function focusMenuItem(item: HTMLElement | undefined, options: MenuItemFocusOptions = {}) {
  if (!item || item.hasAttribute('disabled')) return
  item.toggleAttribute('data-wui-menu-focus-suppressed', options.suppressFocusVisible === true)
  ;(item as HTMLElement & { focusItem?: () => void }).focusItem?.()
}

export function findFocusedMenuItem(panels: Iterable<HTMLElement | undefined>): HTMLElement | undefined {
  return [...panels]
    .filter((panel): panel is HTMLElement => panel !== undefined)
    .flatMap(panel => Array.from(panel.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)))
    .find(item => Boolean(item.shadowRoot?.activeElement))
}

/**
 * 托管 menu item 的模板位锚：每个被迁入 panel 的项在宿主 light DOM 留一个 marker 注释，
 * 表示其模板位。宿主因此始终持有完整有序骨架（marker + 框架注释锚点 + 非 menu 节点），
 * 框架（Vue/React 条件渲染）打开期的插入以宿主为容器、以真实锚点为基准；
 * panel 项的顺序按 marker 序重排；关闭时按 marker 位双向归还。
 */
export type MenuItemAnchors = Map<HTMLElement, Comment>

/**
 * 全集 reconcile：以「content 现有元素 ∪ 宿主元素」为托管全集。
 * 框架（如 Vue 的 v-if 翻转）可能不经宿主直接改写 portal 内节点——卸载旧项留下
 * 注释锚点、把新项直接插进 content——它们都会被这里收编（补 marker + 补隐藏由调用方负责），
 * 已被框架删除/移出两处的条目则清理 marker。最后把宿主中尚存的托管项移入 content。
 */
export function reconcileManagedMenuItems(
  host: HTMLElement,
  content: HTMLElement,
  anchors: MenuItemAnchors,
  markerText: string
): void {
  const inContent = getMovableMenuSubtrees(content)
  const inHost = getMovableMenuSubtrees(host)
  const managed = new Set([...inContent, ...inHost])

  anchors.forEach((marker, subtree) => {
    if (managed.has(subtree)) return
    marker.remove()
    anchors.delete(subtree)
  })

  const ensureMarker = (subtree: HTMLElement, inHostFlag: boolean, before?: Comment) => {
    const existing = anchors.get(subtree)
    if (existing && existing.parentNode === host) return existing
    existing?.remove()
    const marker = document.createComment(markerText)
    if (inHostFlag) {
      host.insertBefore(marker, subtree)
    } else if (before && before.parentNode === host) {
      host.insertBefore(marker, before)
    } else {
      host.appendChild(marker)
    }
    anchors.set(subtree, marker)
    return marker
  }
  for (let index = inContent.length - 1; index >= 0; index--) {
    const subtree = inContent[index]
    const next = inContent[index + 1]
    const nextMarker = next ? anchors.get(next) : undefined
    ensureMarker(subtree, false, nextMarker)
  }
  for (const subtree of inHost) {
    ensureMarker(subtree, true)
  }

  for (const subtree of inHost) {
    content.appendChild(subtree)
  }
}

/** 按宿主 marker 序重排 content 项；顺序已一致时早退。 */
export function orderManagedMenuItems(
  host: HTMLElement,
  content: HTMLElement,
  anchors: MenuItemAnchors,
  markerText: string
): void {
  const targetItems: HTMLElement[] = []
  for (const node of Array.from(host.childNodes)) {
    if (node.nodeType !== Node.COMMENT_NODE || node.textContent !== markerText) continue
    anchors.forEach((marker, subtree) => {
      if (marker !== node || subtree.parentNode !== content) return
      targetItems.push(subtree)
    })
  }

  if (targetItems.length === 0) return

  const currentItems = Array.from(content.children)
  if (currentItems.length === targetItems.length && currentItems.every((item, index) => item === targetItems[index]))
    return

  for (let index = targetItems.length - 1; index >= 0; index--) {
    const item = targetItems[index]
    const next = targetItems[index + 1]
    if (next) {
      if (item.nextElementSibling !== next) content.insertBefore(item, next)
    } else {
      content.appendChild(item)
    }
  }
}

/**
 * 捕获框架 v-if 注释锚点相对其后继元素的绑定，供重排后复位。
 */
export function captureFrameworkAnchors(content: HTMLElement, markerText: string): Map<Comment, HTMLElement | null> {
  const anchors = new Map<Comment, HTMLElement | null>()
  for (const node of Array.from(content.childNodes)) {
    if (node instanceof Comment && node.textContent !== markerText) {
      const nextEl = node.nextElementSibling
      anchors.set(node, nextEl instanceof HTMLElement ? nextEl : null)
    }
  }
  return anchors
}

/**
 * 把锚点复位到捕获时其后继元素之前（尾部锚点保持末尾）。
 */
export function restoreFrameworkAnchors(content: HTMLElement, anchors: Map<Comment, HTMLElement | null>): void {
  for (const [anchor, successor] of anchors) {
    if (anchor.parentNode !== content) continue
    if (successor && successor.parentNode === content) {
      if (anchor.nextElementSibling !== successor) content.insertBefore(anchor, successor)
    } else {
      content.appendChild(anchor)
    }
  }
}

/**
 * 关闭恢复：按 content 子节点序双向归还——元素回到宿主中自己的 marker 位，
 * 框架 v-if 注释锚点插到对应元素之前。归还后清除全部 marker 与登记。
 */
export function returnManagedMenuItemsToSlot(host: HTMLElement, content: HTMLElement, anchors: MenuItemAnchors): void {
  const pending: Comment[] = []
  for (const node of Array.from(content.childNodes)) {
    if (node instanceof Comment) {
      pending.push(node)
      continue
    }
    if (!(node instanceof HTMLElement)) continue
    const marker = anchors.get(node)
    if (!marker) continue
    for (const c of pending) {
      if (marker.parentNode === host) host.insertBefore(c, marker)
      else host.appendChild(c)
    }
    pending.length = 0
    if (marker.parentNode === host) {
      host.insertBefore(node, marker)
    } else {
      host.appendChild(node)
    }
    marker.remove()
    anchors.delete(node)
  }
  for (const c of pending) host.appendChild(c)
  anchors.forEach(marker => marker.remove())
  anchors.clear()
}
