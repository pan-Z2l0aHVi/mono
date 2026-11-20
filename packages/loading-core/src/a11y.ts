let liveEl: HTMLDivElement | null = null

function ensureLiveRegion(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (liveEl?.isConnected) return liveEl

  const el = document.createElement('div')
  el.setAttribute('aria-live', 'polite')
  el.setAttribute('aria-atomic', 'true')
  Object.assign(el.style, {
    position: 'fixed',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap'
  })
  document.body.appendChild(el)
  liveEl = el
  return liveEl
}

/** Announce the active route title through a polite live region. */
export function announceRouteChange(title: string): void {
  const el = ensureLiveRegion()
  if (!el) return

  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = `已进入：${title || '新页面'}`
  })
}
