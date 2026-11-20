import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { dismissAppSplash } from '..'

describe('dismissAppSplash', () => {
  let splash: HTMLDivElement
  let cleanup: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<div id="app-splash"></div>'
    splash = document.getElementById('app-splash') as HTMLDivElement
    cleanup = vi.fn<() => void>()
    window.__SPLASH_CLEANUP__ = cleanup
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    window.__SPLASH_CLEANUP__ = undefined
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
    document.body.replaceChildren()
  })

  it('does not remove or clean up an already dismissed splash', () => {
    splash.dataset.dismissed = 'true'

    dismissAppSplash(0)

    expect(cleanup).not.toHaveBeenCalled()
    expect(splash.isConnected).toBe(true)
  })

  it('calls the global cleanup once and clears it', () => {
    dismissAppSplash(0)

    expect(cleanup).toHaveBeenCalledTimes(1)
    expect(window.__SPLASH_CLEANUP__).toBeUndefined()
    expect(splash.classList.contains('is-leaving')).toBe(true)

    vi.advanceTimersByTime(260)
    expect(splash.isConnected).toBe(false)
  })

  it('subtracts time already spent from minVisibleMs', () => {
    vi.spyOn(performance, 'now').mockReturnValue(400)
    const onDismiss = vi.fn<(durationMs: number) => void>()

    dismissAppSplash(1_000, onDismiss)
    vi.advanceTimersByTime(599)
    expect(splash.classList.contains('is-leaving')).toBe(false)

    vi.advanceTimersByTime(1)
    expect(splash.classList.contains('is-leaving')).toBe(true)
    expect(onDismiss).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(260)
    expect(splash.isConnected).toBe(false)
  })
})
