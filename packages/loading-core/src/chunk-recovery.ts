import { globalProgress } from './progress'

const RELOAD_TS_KEY = 'app:chunk-reload-ts'
const RELOAD_COOLDOWN_MS = 60_000

export interface ChunkRecoveryOptions {
  /** Return true when unsaved form state must be preserved. */
  hasUnsavedChanges?: () => boolean
  /** Return true for an explicit non-router async action. */
  isExplicitAction?: () => boolean
  /** Non-destructive notification hook. */
  onNotify?: (reason: 'offline' | 'update-available') => void
  /** Optional RUM hook. */
  onReport?: (detail: {
    action:
      | 'ignore_prefetch_offline'
      | 'ignore_prefetch_stale'
      | 'notify_offline'
      | 'notify_dirty'
      | 'cooldown_block'
      | 'reload'
  }) => void
}

/**
 * Handle Vite's `vite:preloadError`.
 *
 * `preventDefault()` is only called on the branch that reloads the page. Vite's
 * preload helper treats a prevented event as handled and resolves the import
 * to `undefined`; doing that on a hover prefetch or an offline failure poisons
 * the import cache and leaves the next real navigation blank.
 */
export function setupChunkErrorRecovery(options: ChunkRecoveryOptions = {}): () => void {
  const handler = (event: Event) => {
    const isExplicit = globalProgress.isNavigating() || Boolean(options.isExplicitAction?.())
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine

    if (!isExplicit) {
      options.onReport?.({
        action: isOffline ? 'ignore_prefetch_offline' : 'ignore_prefetch_stale'
      })
      return
    }

    globalProgress.forceReset()

    if (isOffline) {
      options.onReport?.({ action: 'notify_offline' })
      options.onNotify?.('offline')
      return
    }

    if (options.hasUnsavedChanges?.()) {
      options.onReport?.({ action: 'notify_dirty' })
      options.onNotify?.('update-available')
      return
    }

    try {
      const lastTs = Number(window.sessionStorage.getItem(RELOAD_TS_KEY) ?? '0')
      if (Date.now() - lastTs < RELOAD_COOLDOWN_MS) {
        options.onReport?.({ action: 'cooldown_block' })
        options.onNotify?.('update-available')
        return
      }
      window.sessionStorage.setItem(RELOAD_TS_KEY, String(Date.now()))
    } catch {
      options.onReport?.({ action: 'cooldown_block' })
      options.onNotify?.('update-available')
      return
    }

    event.preventDefault()
    options.onReport?.({ action: 'reload' })
    window.location.reload()
  }

  window.addEventListener('vite:preloadError', handler)
  return () => window.removeEventListener('vite:preloadError', handler)
}
