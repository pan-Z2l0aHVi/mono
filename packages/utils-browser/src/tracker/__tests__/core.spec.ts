import { beforeEach, describe, expect, it, vi } from 'vitest'

import { defineTracker } from '../plugins/core'

describe('上报 core 测试用例', () => {
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
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'page view' })

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('降级策略：sendBeacon 失败时应当使用 fetch 上报数据', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    await tracker.track({ event: 'error' })

    expect(fetchSpy).toHaveBeenCalled()
  })
})
