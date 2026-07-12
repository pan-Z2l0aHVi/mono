import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

describe('插件组合测试', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>
  let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    fetchSpy = vi.fn<typeof fetch>(() => Promise.resolve({ ok: true } as Response))
    vi.stubGlobal('fetch', fetchSpy)

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  describe('推荐顺序：batch → offline → last-words', () => {
    function createTracker() {
      return defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    }

    it('正常上报：track 成功发送数据', async () => {
      const tracker = createTracker()
      tracker.track({ event: 'click' })
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('离线缓存：离线时暂停 loop 不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = createTracker()

      sendBeaconSpy.mockClear()
      tracker.track({ event: 'offline' })
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).not.toHaveBeenCalled()
    })

    it('临终遗言：页面关闭时 flush', async () => {
      const tracker = createTracker()

      tracker.track({ event: 'before-close' })
      await vi.runAllTimersAsync()

      window.dispatchEvent(new Event('beforeunload'))

      expect(sendBeaconSpy).toHaveBeenCalled()
    })
  })

  describe('不同顺序：batch → offline', () => {
    it('仍然能正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'click' })
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('离线时仍然不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'offline' })
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).not.toHaveBeenCalled()
    })
  })

  describe('最小组合：只有 core', () => {
    it('正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()

      tracker.track({ event: 'click' })
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('core 有 flush 方法', () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()

      expect('flush' in tracker).toBe(true)
    })
  })

  describe('离线 + 临终遗言', () => {
    it('离线积累的数据在页面关闭时应被 flush', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ action: 'offline-data' })
      await vi.runAllTimersAsync()
      expect(sendBeaconSpy).not.toHaveBeenCalled()

      // 页面关闭时应 flush 积压数据
      window.dispatchEvent(new Event('beforeunload'))
      expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('offline-data'))
    })
  })

  describe('无 batch-track 组合', () => {
    it('core + offline + last-words 无 flush 时不应报错', async () => {
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ event: 'click' })
      await vi.runAllTimersAsync()

      expect(() => {
        window.dispatchEvent(new Event('beforeunload'))
      }).not.toThrow()
    })
  })
})
