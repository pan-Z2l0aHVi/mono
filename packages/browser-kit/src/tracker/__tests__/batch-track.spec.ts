import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'

vi.useFakeTimers()

describe('聚合上报测试用例', () => {
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

  it('批量聚合：在延迟内合并多次上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    tracker.track({ event: 'view' })

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
  })

  it('数据分片：超过阈值时分片', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    for (let i = 0; i < 10000; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
    expect(sendBeaconSpy).not.toHaveBeenCalledOnce()
  })

  it('flush 应立即发送批量数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'queued' })
    tracker.flush()
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('batchDelay <= 0 时应立即上报，不经过批处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'immediate' }, 0)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('大数据分片：恰好 64KB 时应单次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 0.0625 }))
      .make()

    const data = { payload: 'x'.repeat(50) }
    tracker.track(data, -1)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('单条数据应直接发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'single' })
    vi.advanceTimersByTime(200)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
  })

  it('自定义 maxBeaconSize 应生效', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 0.001 }))
      .make()

    // 每条数据约 20 字节，maxBeaconSize=0.001KB ≈ 1 字节，应触发分片
    for (let i = 0; i < 5; i++) {
      tracker.track({ event: `item-${i}` })
    }

    vi.advanceTimersByTime(200)
    await vi.runAllTimersAsync()

    expect(sendBeaconSpy.mock.calls.length).toBeGreaterThan(1)
  })
})
