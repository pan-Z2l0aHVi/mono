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

export function focusMenuItem(item: HTMLElement | undefined) {
  if (!item || item.hasAttribute('disabled')) return
  ;(item as HTMLElement & { focusItem?: () => void }).focusItem?.()
}

export function findFocusedMenuItem(panels: Iterable<HTMLElement | undefined>): HTMLElement | undefined {
  return [...panels]
    .filter((panel): panel is HTMLElement => panel !== undefined)
    .flatMap(panel => Array.from(panel.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)))
    .find(item => Boolean(item.shadowRoot?.activeElement))
}
