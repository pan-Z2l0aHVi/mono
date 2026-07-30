import type { WebUiTheme } from '@/components/theme'

function getParentElement(element: Element): Element | null {
  if (element.parentElement) return element.parentElement
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}

export function findNearestTheme(element: Element): WebUiTheme | undefined {
  let current: Element | null = element
  while (current) {
    if (current instanceof HTMLElement && current.tagName === 'WEB-UI-THEME') {
      const theme = current as WebUiTheme
      if (theme.getOverlayRoot()) return theme
    }
    current = getParentElement(current)
  }
  return undefined
}

export function findRootTheme(): WebUiTheme | undefined {
  return Array.from(document.querySelectorAll<WebUiTheme>('web-ui-theme')).find(theme => {
    if (!theme.getOverlayRoot()) return false
    const parent = getParentElement(theme)
    return !parent || !findNearestTheme(parent)
  })
}
