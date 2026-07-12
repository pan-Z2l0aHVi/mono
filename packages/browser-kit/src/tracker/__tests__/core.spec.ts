import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { defineTracker } from '../core'

vi.useFakeTimers()

describe('上报 core 测试用例', () => {
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
  })

  it('应当调用 sendBeacon 上报数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'page view' })
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('降级策略：sendBeacon 失败时应当使用 fetch 上报数据', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'error' })
    await vi.runAllTimersAsync()

    expect(fetchSpy).toHaveBeenCalled()
  })

  it('空数据：null 时不应调用 sendBeacon', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(null as unknown as object)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('空数据：undefined 时不应调用 sendBeacon', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(undefined as unknown as object)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
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

    it('恢复的数据处理后应从 storage 清除', () => {
      storage.set('queue:https://example.com', [{ event: 'a' }, { event: 'b' }])

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      // 恢复的数据同步处理完后清除
      // 追踪一个新数据来验证状态
      tracker.pause()
      tracker.track({ event: 'c' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'c' }])
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
      await vi.runAllTimersAsync()

      expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('restored'))
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('发送完成后 storage 应清空', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'click' })
      await vi.runAllTimersAsync()

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
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalledWith('https://example.com', expect.stringContaining('"extra":true'))
  })

  it('sendBeacon + fetch 双重失败时不应抛异常', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('sendBeacon failed')
    })
    fetchSpy.mockRejectedValue(new Error('fetch failed'))

    const tracker = defineTracker({ url: 'https://example.com' }).make()

    expect(() => {
      tracker.track({ event: 'fail' })
    }).not.toThrow()
  })
})
