import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { globalProgress, setupChunkErrorRecovery, type ChunkRecoveryOptions } from '..'

const originalOnLine = navigator.onLine

describe('setupChunkErrorRecovery', () => {
  let dispose: (() => void) | null = null
  let reload: ReturnType<typeof vi.fn<() => void>>
  let reports: string[]
  let notices: string[]
  let options: ChunkRecoveryOptions

  const setOnline = (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: online })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    sessionStorage.clear()
    globalProgress.forceReset()
    reload = vi.fn<() => void>()
    reload = vi.fn<() => void>()
    reports = []
    notices = []
    options = {
      onReport: detail => reports.push(detail.action),
      onNotify: reason => notices.push(reason)
    }

    const listeners = new Map<string, EventListener>()
    const storage = sessionStorage
    const fakeWindow = {
      addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
      removeEventListener: (type: string, listener: EventListener) => {
        if (listeners.get(type) === listener) listeners.delete(type)
      },
      dispatchEvent: (event: Event) => {
        listeners.get(event.type)?.(event)
        return true
      },
      setTimeout: globalThis.setTimeout,
      clearTimeout: globalThis.clearTimeout,
      setInterval: globalThis.setInterval,
      clearInterval: globalThis.clearInterval,
      sessionStorage: storage,
      location: { reload }
    }
    vi.stubGlobal('window', fakeWindow)
  })

  afterEach(() => {
    dispose?.()
    dispose = null
    globalProgress.forceReset()
    setOnline(originalOnLine)
    sessionStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  const dispatchPreloadError = () => {
    const event = new Event('vite:preloadError', { cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)
    return preventDefault
  }

  it('ignores a non-explicit offline prefetch without preventing default', () => {
    setOnline(false)
    dispose = setupChunkErrorRecovery(options)

    const preventDefault = dispatchPreloadError()

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.reload as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(reports).toEqual(['ignore_prefetch_offline'])
    expect(notices).toEqual([])
  })

  it('prevents default and reloads once for an explicit online navigation', () => {
    setOnline(true)
    dispose = setupChunkErrorRecovery(options)
    globalProgress.begin()

    const preventDefault = dispatchPreloadError()

    expect(preventDefault).toHaveBeenCalledTimes(1)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(reports).toEqual(['reload'])
    expect(globalProgress.isNavigating()).toBe(false)
  })

  it('does not prevent default or reload when the form is dirty', () => {
    setOnline(true)
    dispose = setupChunkErrorRecovery({ ...options, hasUnsavedChanges: () => true })
    globalProgress.begin()

    const preventDefault = dispatchPreloadError()

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.reload as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(reports).toEqual(['notify_dirty'])
    expect(notices).toEqual(['update-available'])
  })

  it('does not prevent default or reload during the cooldown window', () => {
    setOnline(true)
    sessionStorage.setItem('app:chunk-reload-ts', String(Date.now() - 1_000))
    dispose = setupChunkErrorRecovery(options)
    globalProgress.begin()

    const preventDefault = dispatchPreloadError()

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.reload as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(reports).toEqual(['cooldown_block'])
    expect(notices).toEqual(['update-available'])
  })

  it('treats storage failures as a blocked reload without preventing default', () => {
    setOnline(true)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('storage disabled', 'SecurityError')
    })
    dispose = setupChunkErrorRecovery(options)
    globalProgress.begin()

    const preventDefault = dispatchPreloadError()

    expect(preventDefault).not.toHaveBeenCalled()
    expect(window.location.reload as ReturnType<typeof vi.fn>).not.toHaveBeenCalled()
    expect(reports).toEqual(['cooldown_block'])
    expect(notices).toEqual(['update-available'])
  })
})
