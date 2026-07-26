import { getFallbackOverlayRoot } from '@/shared/theme/overlay-root'
import { findNearestTheme, findRootTheme } from '@/shared/theme/theme-scope'

export function createMenuPortalOverlay(className: string, target?: Element): HTMLElement {
  const overlay = document.createElement('div')
  overlay.className = `wui-menu-portal-overlay wui-glass ${className}`
  const root = target ? findNearestTheme(target) : findRootTheme()
  const container = root?.getOverlayRoot() ?? getFallbackOverlayRoot()
  container.appendChild(overlay)
  return overlay
}
