import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { capturedRequests, clearCapturedRequests, worker } from '../../../test-helper'
import { defineTracker } from '../core'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 处理请求后再切回 */
async function waitForMsw(ms = 50) {
  vi.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, ms))
  vi.useFakeTimers()
}

describe('上报 core 测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(() => {
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

    it('恢复的数据处理后应从 storage 清除', async () => {
      storage.set('queue:https://example.com', [{ event: 'a' }, { event: 'b' }])

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      // 恢复的数据同步处理完后清除
      // 追踪一个新数据来验证状态
      tracker.pause()
      tracker.track({ event: 'c' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'c' }])

      // 等待恢复数据的 fetch 完成，避免污染后续测试
      await waitForMsw()
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

      expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
      expect(JSON.stringify(capturedRequests[0].body)).toContain('restored')
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
