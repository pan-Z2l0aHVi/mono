import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'
import { defineLastWords } from '../plugins/last-words'

describe('亡语插件测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>
  let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchSpy)
  })

  it('beforeunload 触发 flush', () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .use(defineLastWords())
      .make()

    tracker.onLastWords()
    void tracker.track({ event: 'click before leave' })

    window.dispatchEvent(new Event('beforeunload'))

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('pagehide 触发 flush', () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .use(defineLastWords())
      .make()

    tracker.onLastWords()
    void tracker.track({ event: 'page hide test' })

    window.dispatchEvent(new Event('pagehide'))

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('visibilitychange hidden 触发 flush', () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .use(defineLastWords())
      .make()

    tracker.onLastWords()
    void tracker.track({ event: 'visibility test' })

    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    })

    document.dispatchEvent(new Event('visibilitychange'))

    expect(sendBeaconSpy).toHaveBeenCalled()
  })
})
