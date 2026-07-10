import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../plugins/core'

describe('上报 core 测试用例', () => {
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

  it('应当调用 sendBeacon 上报数据', () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    void tracker.track({ event: 'page view' })

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

  it('空数据：null 时不应调用 sendBeacon', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    await tracker.track(null as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('空数据：undefined 时不应调用 sendBeacon', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    await tracker.track(undefined as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
