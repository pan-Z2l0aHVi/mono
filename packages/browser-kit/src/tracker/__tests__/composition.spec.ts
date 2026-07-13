import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { capturedRequests, clearCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

/** 等待 MSW 处理请求 */
async function waitForMsw(ms = 100) {
  await new Promise(resolve => setTimeout(resolve, ms))
}

/** 轮询等待 MSW 捕获到指定数量的请求 */
async function waitForMswCapture(minCount = 1, timeout = 2000) {
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

describe('插件组合测试', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(() => {
    vi.clearAllMocks()
    clearCapturedRequests()
    localStorage.clear()

    // 始终返回 false，强制走 fetch 降级路径，由 MSW 拦截
    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => false)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  describe('推荐顺序：batch → offline → last-words', () => {
    function createTracker() {
      return defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    }

    it('正常上报：track 成功发送数据', async () => {
      const tracker = createTracker()
      tracker.track({ event: 'click' })
      await waitForMswCapture()

      expect(capturedRequests.length).toBeGreaterThan(0)
      expect(capturedRequests[0].url).toBe('/')
    })

    it('离线缓存：离线时暂停 loop 不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = createTracker()

      sendBeaconSpy.mockClear()
      tracker.track({ event: 'offline' })
      await waitForMsw()

      expect(sendBeaconSpy).not.toHaveBeenCalled()
      expect(capturedRequests).toHaveLength(0)
    })

    it('临终遗言：页面关闭时 flush', async () => {
      const tracker = createTracker()

      tracker.track({ event: 'before-close' })
      await waitForMswCapture()

      window.dispatchEvent(new Event('beforeunload'))
      await waitForMswCapture()

      expect(capturedRequests.length).toBeGreaterThan(0)
    })
  })

  describe('不同顺序：batch → offline', () => {
    it('仍然能正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'click' })
      await waitForMswCapture()

      expect(capturedRequests.length).toBeGreaterThan(0)
    })

    it('离线时仍然不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'offline' })
      await waitForMsw()

      expect(sendBeaconSpy).not.toHaveBeenCalled()
      expect(capturedRequests).toHaveLength(0)
    })
  })

  describe('最小组合：只有 core', () => {
    it('正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()

      tracker.track({ event: 'click' })
      await waitForMsw()

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
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ action: 'offline-data' })
      await waitForMsw()
      expect(sendBeaconSpy).not.toHaveBeenCalled()
      expect(capturedRequests).toHaveLength(0)

      // 页面关闭时应 flush 积压数据
      window.dispatchEvent(new Event('beforeunload'))
      await waitForMsw()
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
      await waitForMsw()

      expect(() => {
        window.dispatchEvent(new Event('beforeunload'))
      }).not.toThrow()
    })
  })
})
