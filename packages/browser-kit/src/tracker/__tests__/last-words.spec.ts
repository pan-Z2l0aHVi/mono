import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

describe('亡语插件测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })
  })

  it('beforeunload 应触发 flush', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 0 }))
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'before-close' })
    await vi.runAllTimersAsync()

    sendBeaconSpy.mockClear()
    tracker.track({ event: 'new-data' })

    window.dispatchEvent(new Event('beforeunload'))

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('hasSent 在页面重新可见时应重置', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 0 }))
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    // 离线时 track，数据积压
    tracker.track({ event: 'first' })
    await vi.runAllTimersAsync()

    // 第一次 hidden → flush 积压数据
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('first'))

    // 页面重新可见 → 重置 hasSent
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // 再次离线 track
    sendBeaconSpy.mockClear()
    tracker.track({ event: 'second' })
    await vi.runAllTimersAsync()

    // 第二次 hidden → 应再次 flush
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('second'))
  })

  it('无 flush 方法时不应报错', () => {
    expect(() => {
      defineTracker({ url: 'https://example.com' }).use(defineLastWords()).make()

      window.dispatchEvent(new Event('beforeunload'))
    }).not.toThrow()
  })
})
