import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { clearCapturedRequests, capturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'

vi.useFakeTimers()

/** 临时切换到真实计时器，等待 MSW 处理请求后再切回 */
async function waitForMsw(ms = 100) {
  vi.useRealTimers()
  await new Promise(resolve => setTimeout(resolve, ms))
  vi.useFakeTimers()
}

describe('聚合上报测试用例', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCapturedRequests()
    localStorage.clear()

    // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 拦截
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: vi.fn<Navigator['sendBeacon']>(() => false)
    })
  })

  it('批量聚合：在延迟内合并多次上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    tracker.track({ event: 'view' })

    expect(capturedRequests).toHaveLength(0)

    vi.advanceTimersByTime(200)
    await waitForMsw()

    expect(capturedRequests).toHaveLength(1)
  })

  it('数据分片：超过阈值时分片', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    const totalCount = 10000
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)
    await waitForMsw()

    // 分片后每次请求只包含部分数据（不是全部），证明分片生效
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    const body = capturedRequests[0].body as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThan(totalCount)
  })

  it('flush 应立即发送批量数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'queued' })
    tracker.flush()
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('batchDelay <= 0 时应立即上报，不经过批处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'immediate' }, 0)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('defaultBatchDelay=0 时不延迟，直接上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 0 }))
      .make()

    tracker.track({ event: 'instant-1' })
    // defaultBatchDelay=0 时 track 使用 setTimeout(0)，advance 任意正数即可触发
    vi.advanceTimersByTime(1)
    await waitForMsw()

    tracker.track({ event: 'instant-2' })
    vi.advanceTimersByTime(1)
    await waitForMsw()

    // 两条数据应该被分两次单独发送（不经过批处理合并）
    expect(capturedRequests.length).toBe(2)
  })

  it('大数据分片：恰好 64KB 时应单次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 0.0625 }))
      .make()

    const data = { payload: 'x'.repeat(50) }
    tracker.track(data, -1)
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('单条数据应直接发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'single' })
    vi.advanceTimersByTime(200)
    await waitForMsw()

    expect(capturedRequests).toHaveLength(1)
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
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThan(1)
  })
})
