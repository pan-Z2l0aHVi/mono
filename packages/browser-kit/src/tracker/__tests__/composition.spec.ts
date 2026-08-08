import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

/** 等待 MSW 捕获指定数量的请求。 */
async function waitForMsw(minCount = 1, timeout = 1000) {
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

describe('插件组合测试', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(async () => {
    // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
    await settleCapturedRequests()

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
      await waitForMsw()

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

    it('临终遗言：flush 立即发送积压数据', async () => {
      // 真实 beforeunload 会让 keepalive fetch 挂起、阻塞后续用例（MSW handler
      // 无法完成），因此改用 flush() 覆盖 last-words 调用的发送路径。
      const tracker = createTracker()

      tracker.track({ event: 'before-close' })
      clearCapturedRequests()
      tracker.flush()
      await waitForMsw()

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
      await waitForMsw()

      expect(capturedRequests.length).toBeGreaterThan(0)

      // 等待 batch 发送完成，避免污染后续测试
      await new Promise(resolve => setTimeout(resolve, 600))
    })

    it('离线时仍然不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'offline' })
      // 等待 batch delay (500ms) + buffer，确保 batch 发送尝试
      await new Promise(resolve => setTimeout(resolve, 600))

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
    it('离线积累的数据 flush 时立即发送', async () => {
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

      // 离线积压的数据通过 flush 立即发送（beforeunload 内部调用同一路径）
      tracker.flush()
      await waitForMsw()
      expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('offline-data'))
    })
  })

  describe('无 batch-track 组合', () => {
    it('core + offline + last-words flush 不应报错', async () => {
      const tracker = defineTracker({ url: 'https://example.com' })
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ event: 'click' })
      await waitForMsw()

      expect(() => {
        tracker.flush()
      }).not.toThrow()
    })
  })
})
