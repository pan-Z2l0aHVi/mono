export const MENU_CONTENT_SELECTOR = 'web-ui-dropdown-item, web-ui-dropdown-divider, web-ui-dropdown-header'
export const MENU_ITEM_SELECTOR = 'web-ui-dropdown-item'

export function getMenuChildren(container: ParentNode): HTMLElement[] {
  return Array.from(container.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.matches(MENU_CONTENT_SELECTOR)
  )
}

export function getEnabledMenuItems(container: ParentNode): HTMLElement[] {
  return getMenuChildren(container).filter(item => item.matches(`${MENU_ITEM_SELECTOR}:not([disabled])`))
}

export function moveMenuChildren(source: ParentNode, target: HTMLElement) {
  getMenuChildren(source).forEach(child => target.appendChild(child))
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
