import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

export interface MenuPortalOverlay {
  readonly panel: HTMLElement
  readonly content: HTMLElement
}

export function createMenuPortalOverlay(className: string, target?: Element): MenuPortalOverlay {
  const panel = document.createElement('div')
  panel.className = `wui-menu-portal-overlay wui-floating-panel wui-glass ${className}`
  panel.dataset.wuiPresence = 'entering'
  const scroll = document.createElement('div')
  scroll.className = 'wui-menu-scroll'
  const content = document.createElement('div')
  content.className = 'wui-menu-content'
  scroll.append(content)
  panel.append(scroll)

  const root = target ? findNearestTheme(target) : findRootTheme()
  const container = root?.getOverlayRoot() ?? getFallbackOverlayRoot()
  container.appendChild(panel)

  return { panel, content }
}
