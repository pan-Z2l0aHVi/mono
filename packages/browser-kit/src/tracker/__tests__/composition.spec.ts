import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'
import { defineFailureRetry } from '../plugins/failure-retry'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

// 模拟 idb-keyval
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn<(key: string) => Promise<any>>(async key => _mockStore[key]),
  del: vi.fn<(key: string) => Promise<void>>(async key => {
    delete _mockStore[key]
  }),
  set: vi.fn<(key: string, val: any) => Promise<void>>(async (key, val) => {
    _mockStore[key] = val
  }),
  update: vi.fn<(key: string, updater: (prev: any) => any) => Promise<void>>(async (key, updater) => {
    const oldValue = _mockStore[key] || []
    _mockStore[key] = updater(oldValue)
  })
}))

describe('插件组合测试', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>
  let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.clearAllMocks()
    _mockStore = {}

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

  describe('推荐顺序：batch → offline → failure → last-words', () => {
    function createTracker() {
      return defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore({ restoreKey: 'test-offline' }))
        .use(defineFailureRetry({ restoreKey: 'test-retry' }))
        .use(defineLastWords())
        .make()
    }

    it('正常上报：track 成功发送数据', async () => {
      const tracker = createTracker()

      await tracker.track({ event: 'click' })

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('离线缓存：离线时数据入队不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const tracker = createTracker()

      tracker.onOfflineRestore()
      await tracker.track({ event: 'offline' })

      expect(sendBeaconSpy).not.toHaveBeenCalled()
    })

    it('失败重试：失败后下次成功时重试', async () => {
      sendBeaconSpy.mockReturnValue(false)
      fetchSpy.mockRejectedValueOnce(new Error('Network error'))
      fetchSpy.mockResolvedValue({ ok: true } as Response)

      const tracker = createTracker()

      // 第一次失败
      try {
        await tracker.track({ event: 'fail' })
      } catch {
        /* 预期的错误 */
      }

      // 第二次成功，触发重试
      await tracker.track({ event: 'success' })

      await new Promise(r => setTimeout(r, 50))

      // 应该有重试调用
      expect(fetchSpy.mock.calls.length).toBeGreaterThan(1)
    })

    it('flush 链式调用：清空所有队列', async () => {
      sendBeaconSpy.mockReturnValue(false)
      fetchSpy.mockRejectedValueOnce(new Error('Network error'))
      fetchSpy.mockResolvedValue({ ok: true } as Response)

      const tracker = createTracker()

      try {
        await tracker.track({ event: 'queued' })
      } catch {
        /* 预期的错误 */
      }

      tracker.flush()

      await new Promise(r => setTimeout(r, 50))

      // flush 应该尝试发送数据
      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('临终遗言：页面关闭时 flush', () => {
      const tracker = createTracker()
      tracker.onLastWords()

      void tracker.track({ event: 'before-close' })

      window.dispatchEvent(new Event('beforeunload'))

      expect(sendBeaconSpy).toHaveBeenCalled()
    })
  })

  describe('不同顺序：failure → batch → offline', () => {
    it('仍然能正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineFailureRetry({ restoreKey: 'test-retry' }))
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore({ restoreKey: 'test-offline' }))
        .make()

      await tracker.track({ event: 'click' })

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('离线时仍然不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineFailureRetry({ restoreKey: 'test-retry' }))
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineOfflineRestore({ restoreKey: 'test-offline' }))
        .make()

      tracker.onOfflineRestore()
      await tracker.track({ event: 'offline' })

      expect(sendBeaconSpy).not.toHaveBeenCalled()
    })
  })

  describe('最小组合：只有 core', () => {
    it('正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()

      await tracker.track({ event: 'click' })

      expect(sendBeaconSpy).toHaveBeenCalled()
    })

    it('core 没有 flush 方法', () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()

      expect('flush' in tracker).toBe(false)
    })
  })

  describe('部分组合：batch + failure', () => {
    it('批量 + 重试', async () => {
      sendBeaconSpy.mockReturnValue(false)
      fetchSpy.mockRejectedValueOnce(new Error('Network error'))
      fetchSpy.mockResolvedValue({ ok: true } as Response)

      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack({ defaultBatchDelay: 0 }))
        .use(defineFailureRetry({ restoreKey: 'test-retry' }))
        .make()

      try {
        await tracker.track({ event: 'fail' })
      } catch {
        /* 预期的错误 */
      }

      await tracker.track({ event: 'success' })

      await new Promise(r => setTimeout(r, 50))

      expect(fetchSpy.mock.calls.length).toBeGreaterThan(1)
    })
  })
})
