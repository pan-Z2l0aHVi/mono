import glass from '@/assets/glass.css?inline'
import menuPortalStyle from '@/assets/menu-portal.css?inline'
import toastContainerStyle from '@/assets/toast-containers.css?inline'

const FALLBACK_ROOT_ATTRIBUTE = 'data-wui-overlay-root'

const overlayStyle = `${glass}\n${toastContainerStyle}\n${menuPortalStyle}`

export function applyOverlayRootStyles(root: ShadowRoot) {
  const style = document.createElement('style')
  style.textContent = overlayStyle
  root.prepend(style)
}

export function getFallbackOverlayRoot(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(`[${FALLBACK_ROOT_ATTRIBUTE}]`)
  if (existing?.shadowRoot) return getOverlayContainer(existing.shadowRoot)

  const host = document.createElement('div')
  host.setAttribute(FALLBACK_ROOT_ATTRIBUTE, '')
  const root = host.attachShadow({ mode: 'open' })
  applyOverlayRootStyles(root)
  document.body.appendChild(host)
  return getOverlayContainer(root)
}

export function getOverlayContainer(root: ShadowRoot): HTMLElement {
  const existing = root.querySelector<HTMLElement>('[data-wui-overlay-container]')
  if (existing) return existing

  const container = document.createElement('div')
  container.setAttribute('data-wui-overlay-container', '')
  root.appendChild(container)
  return container
}
