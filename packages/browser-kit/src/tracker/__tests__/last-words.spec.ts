import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'
import { defineLastWords } from '../plugins/last-words'

describe('亡语插件测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sendBeaconSpy = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    fetchSpy = vi.fn(() => Promise.resolve({ ok: true }))
    ;(global as any).fetch = fetchSpy
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
