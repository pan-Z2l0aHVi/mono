import { announceRouteChange, globalProgress, type ProgressToken } from '@greypan/loading-core'
import { useRouter, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'

/**
 * Wire TanStack Router navigation events into `globalProgress`.
 *
 * `onBeforeLoad` runs synchronously before a lazy route import starts, so the
 * token exists when Vite dispatches `vite:preloadError`. `onResolved` ends the
 * token, and the router status fallback releases tokens when a navigation is
 * blocked or cancelled.
 */
export function useTanStackRouterProgress(): void {
  const router = useRouter()
  const tokenRef = useRef<ProgressToken | null>(null)
  const isHydratedRef = useRef(false)

  const endCurrent = () => {
    tokenRef.current?.end()
    tokenRef.current = null
  }

  useEffect(() => {
    const frames = new Set<number>()
    const unsubscribeBeforeLoad = router.subscribe('onBeforeLoad', ({ pathChanged }) => {
      if (!pathChanged || !isHydratedRef.current) return
      const nextToken = globalProgress.begin()
      endCurrent()
      tokenRef.current = nextToken
    })

    const unsubscribeResolved = router.subscribe('onResolved', endCurrent)

    const unsubscribeRendered = router.subscribe('onRendered', () => {
      const frame = requestAnimationFrame(() => {
        frames.delete(frame)
        announceRouteChange(document.title)
      })
      frames.add(frame)
    })

    return () => {
      unsubscribeBeforeLoad()
      unsubscribeResolved()
      unsubscribeRendered()
      frames.forEach(frame => cancelAnimationFrame(frame))
      frames.clear()
      endCurrent()
    }
  }, [router])

  const isIdle = useRouterState({ select: state => state.status === 'idle' })
  useEffect(() => {
    isHydratedRef.current = true
    if (isIdle) endCurrent()
  }, [isIdle])
}
