import { beforeEach, describe, expect, it, vi } from 'vitest'

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

  it('应当调用 sendBeacon 上报数据', () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .use(defineLastWords())
      .make()

    tracker.onLastWords()
    tracker.track({ event: 'click before leave' })

    window.dispatchEvent(new Event('beforeunload')) // or pagehide,visibilitychange hidden

    expect(sendBeaconSpy).toHaveBeenCalled()
  })
})
