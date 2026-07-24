import glass from '@/assets/glass.css?inline'

const ROOT_ATTRIBUTE = 'data-wui-menu-portal-root'
const STYLE_ID = 'wui-menu-portal-styles'

const portalStyle = `
.wui-menu-portal-overlay {
  --wui-glass-shadow: 0 4px 16px rgb(0 0 0 / 0.25);
  position: fixed;
  z-index: 99999;
  box-sizing: border-box;
  min-width: 200px;
  max-width: 90vw;
  max-height: 80vh;
  padding: 4px;
  border-radius: 20px;
  overflow-y: auto;
  background-color: rgb(240 240 240 / 0.8);
}

.wui-menu-portal-overlay.dropdown-overlay .dropdown-scroll {
  min-width: 200px;
  max-height: 320px;
  overflow-y: auto;
}
`

function ensurePortalStyles() {
  if (document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `${glass}\n${portalStyle}`
  document.head.appendChild(style)
}

function getPortalRoot(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`[${ROOT_ATTRIBUTE}]`)
  if (existing) return existing

  const root = document.createElement('div')
  root.setAttribute(ROOT_ATTRIBUTE, '')
  document.body.appendChild(root)
  return root
}

export function createMenuPortalOverlay(className: string): HTMLElement {
  ensurePortalStyles()
  const overlay = document.createElement('div')
  overlay.className = `wui-menu-portal-overlay wui-glass wui-glass-no-after ${className}`
  getPortalRoot().appendChild(overlay)
  return overlay
}
