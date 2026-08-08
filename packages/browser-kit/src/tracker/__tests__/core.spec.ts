import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests, worker } from '../../../test-helper'
import { defineTracker } from '../core'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 捕获指定数量的请求后再切回。 */
async function waitForMsw(minCount = 1, timeout = 1000) {
  vi.useRealTimers()
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  vi.useFakeTimers()
}

describe('上报 core 测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(async () => {
    // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
    await settleCapturedRequests()

    vi.clearAllMocks()
    clearCapturedRequests()
    localStorage.clear()

    // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 拦截
    sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => false)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })
  })

  it('应当调用 sendBeacon 上报数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'page view' })
    await waitForMsw()

    expect(sendBeaconSpy).toHaveBeenCalled()
    const payload = sendBeaconSpy.mock.calls[0][1]
    expect(typeof payload).toBe('string')
    expect(payload).toContain('page view')
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('降级策略：sendBeacon 失败时应当使用 fetch 上报数据', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'error' })
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(capturedRequests[0].body)).toContain('error')
  })

  it('空数据：null 时不应调用 sendBeacon', () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(null as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
  })

  it('空数据：undefined 时不应调用 sendBeacon', () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(undefined as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
  })

  describe('持久化', () => {
    const storage = defineLocal('tracker')

    it('队列积压时应持久化到 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'click' }])
    })

    it('恢复的数据发送完成后从 storage 清除', async () => {
      storage.set('queue:https://example.com', [{ event: 'a' }, { event: 'b' }])

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.pause()
      tracker.track({ event: 'c' })

      // 等 a、b 两条恢复记录发送完成（confirm 后从 pendingSet 清除），
      // c 仍被 pause 积压，storage 应只剩 c。
      await waitForMsw(2)
      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'c' }])
    })

    it('恢复的数据发送失败后保留在 storage，供下次启动重试', async () => {
      storage.set('queue:https://example.com', [{ event: 'sticky' }])
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('sendBeacon failed')
      })
      worker.use(http.post('*', () => HttpResponse.error()))

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      // 等待 fetch 降级路径失败（reject）完成后，断言 storage 未被清除。
      vi.useRealTimers()
      await new Promise(resolve => setTimeout(resolve, 200))
      vi.useFakeTimers()

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'sticky' }])
    })

    it('disablePersistence 时不写 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com', disablePersistence: true }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toBeNull()
    })

    it('启动时应从 storage 恢复并发送', async () => {
      storage.set('queue:https://example.com', [{ event: 'restored' }])

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      await waitForMsw()

      expect(capturedRequests.some(request => JSON.stringify(request.body).includes('restored'))).toBe(true)
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('发送完成后 storage 应清空', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'click' })
      await waitForMsw()

      const stored = storage.get('queue:https://example.com')
      expect(stored).toBeNull()
    })
  })

  it('transform 函数应转换上报数据', async () => {
    const tracker = defineTracker({
      url: 'https://example.com',
      transform: (data: object) => ({ ...data, extra: true })
    }).make()
    tracker.track({ event: 'click' })
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(capturedRequests[0].body)).toContain('"extra":true')
  })

  it('sendBeacon + fetch 双重失败时不应抛异常', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('sendBeacon failed')
    })
    worker.use(http.post('*', () => HttpResponse.error()))

    const tracker = defineTracker({ url: 'https://example.com' }).make()

    expect(() => {
      tracker.track({ event: 'fail' })
    }).not.toThrow()
  })
})
