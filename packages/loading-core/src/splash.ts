declare global {
  interface Window {
    __SPLASH_CLEANUP__?: () => void
  }
}

/**
 * Dismiss `#app-splash` with a transition.
 *
 * `minVisibleMs` is measured from the page time origin, matching the inline
 * splash that starts when HTML parsing begins. A splash that has already been
 * dismissed is left alone, and the global cleanup callback is called once.
 */
export function dismissAppSplash(minVisibleMs = 0, onDismiss?: (durationMs: number) => void): void {
  if (typeof document === 'undefined') return
  const el = document.getElementById('app-splash')
  if (!el || el.dataset.dismissed === 'true') return
  el.dataset.dismissed = 'true'

  window.__SPLASH_CLEANUP__?.()
  window.__SPLASH_CLEANUP__ = undefined

  const remaining = Math.max(0, minVisibleMs - performance.now())

  const remove = () => {
    onDismiss?.(performance.now())
    requestAnimationFrame(() => {
      el.classList.add('is-leaving')
      const cleanup = () => el.remove()
      el.addEventListener('transitionend', cleanup, { once: true })
      window.setTimeout(cleanup, 260)
    })
  }

  if (remaining > 0) {
    window.setTimeout(remove, remaining)
  } else {
    remove()
  }
}
