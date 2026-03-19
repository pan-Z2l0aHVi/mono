import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'

describe('批量聚合上报测试用例', () => {
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

  it('批量聚合：在延迟内合并多次上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    tracker.track({ event: 'view' })

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    await new Promise(r => setTimeout(r, 200))

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
  })

  it('数据分片：超过阈值时分片', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    for (let i = 0; i < 10000; i++) {
      tracker.track({ event: 'view' })
    }

    await new Promise(r => setTimeout(r, 200))
    expect(sendBeaconSpy).toHaveBeenCalled()
    expect(sendBeaconSpy).not.toHaveBeenCalledOnce()
  })
})
