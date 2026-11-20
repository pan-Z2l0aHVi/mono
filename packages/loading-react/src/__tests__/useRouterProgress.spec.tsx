import { announceRouteChange, globalProgress } from '@greypan/loading-core'
import type * as loadingCore from '@greypan/loading-core'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { useTanStackRouterProgress } from '../useRouterProgress'

const routerMocks = vi.hoisted(() => {
  const callbacks = new Map<string, (event?: { pathChanged?: boolean }) => void>()
  const router = {
    subscribe: vi.fn<(event: string, callback: (event?: { pathChanged?: boolean }) => void) => () => boolean>(
      (event, callback) => {
        callbacks.set(event, callback)
        return () => callbacks.delete(event)
      }
    )
  }
  return { callbacks, router, status: 'idle' as 'idle' | 'pending' }
})

vi.mock('@greypan/loading-core', async importOriginal => ({
  ...(await importOriginal<typeof loadingCore>()),
  announceRouteChange: vi.fn<typeof announceRouteChange>()
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: () => routerMocks.router,
  useRouterState: () => routerMocks.status === 'idle'
}))

describe('useTanStackRouterProgress', () => {
  beforeEach(() => {
    routerMocks.callbacks.clear()
    routerMocks.router.subscribe.mockClear()
    routerMocks.status = 'idle'
    globalProgress.forceReset()
  })

  afterEach(() => {
    globalProgress.forceReset()
  })

  it('starts synchronously during onBeforeLoad and ends on resolution', () => {
    const { unmount } = renderHook(() => useTanStackRouterProgress())
    const beforeLoad = routerMocks.callbacks.get('onBeforeLoad')
    expect(beforeLoad).toBeTruthy()

    act(() => beforeLoad?.({ pathChanged: true }))
    expect(globalProgress.isNavigating()).toBe(true)

    act(() => routerMocks.callbacks.get('onResolved')?.())
    expect(globalProgress.isNavigating()).toBe(false)
    unmount()
  })

  it('does not start a token when the path did not change', () => {
    renderHook(() => useTanStackRouterProgress())

    act(() => routerMocks.callbacks.get('onBeforeLoad')?.({ pathChanged: false }))
    expect(globalProgress.isNavigating()).toBe(false)
  })

  it('ignores onBeforeLoad emitted while the hook is subscribing before hydration', () => {
    routerMocks.router.subscribe.mockImplementation((event, callback) => {
      routerMocks.callbacks.set(event, callback)
      if (event === 'onBeforeLoad') callback({ pathChanged: true })
      return () => routerMocks.callbacks.delete(event)
    })

    renderHook(() => useTanStackRouterProgress())
    expect(globalProgress.isNavigating()).toBe(false)
  })

  it('cancels pending announcements on unmount', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useTanStackRouterProgress())
    act(() => routerMocks.callbacks.get('onRendered')?.())
    unmount()
    vi.advanceTimersByTime(100)
    expect(announceRouteChange).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('ends the active token on unmount', () => {
    const { unmount } = renderHook(() => useTanStackRouterProgress())
    act(() => routerMocks.callbacks.get('onBeforeLoad')?.({ pathChanged: true }))
    expect(globalProgress.isNavigating()).toBe(true)

    unmount()
    expect(globalProgress.isNavigating()).toBe(false)
  })
})
