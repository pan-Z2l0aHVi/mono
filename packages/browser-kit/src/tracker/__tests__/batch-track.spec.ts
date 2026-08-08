import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { clearCapturedRequests, capturedRequests, settleCapturedRequests } from '../../../test-helper'
import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'

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

describe('聚合上报测试用例', () => {
  beforeEach(async () => {
    // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
    await settleCapturedRequests()

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

  it('数据分片：超过阈值时分片生效', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    const totalCount = 10000
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)
    await waitForMsw()

    // 分片生效：请求 body 是部分数据（不是全部），证明递归分片切分了批次
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    const body = capturedRequests[0].body as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThan(totalCount)
  })

  it('分片后所有数据无丢失（sendBeacon 累计条数一致）', async () => {
    // keepalive fetch 在 Chromium 有并发限制（并发分片请求只有第一个能被 MSW
    // 捕获），因此改用 sendBeacon 同步路径统计分片完整性。
    const sendBeacon = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeacon
    })

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    const totalCount = 10000
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)

    // sendBeacon 同步执行，所有分片立即调用；第二参数现在是 Blob，需要异步读取
    expect(sendBeacon.mock.calls.length).toBeGreaterThanOrEqual(2)
    let total = 0
    for (const call of sendBeacon.mock.calls) {
      const payload = call[1] as Blob
      const arr = JSON.parse(await payload.text()) as unknown[]
      total += arr.length
    }
    expect(total).toBe(totalCount)
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
    await waitForMsw(1)

    tracker.track({ event: 'instant-2' })
    vi.advanceTimersByTime(1)
    await waitForMsw(2)

    // 两条数据应该被分两次单独发送（不经过批处理合并）
    expect(capturedRequests.length).toBe(2)
  })

  it('未超过 maxBeaconSize 时整批单次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 64 }))
      .make()

    // 3 条小数据总大小远小于 64KB，flush 时 sliceTrack 判断不超限，整批单次发送
    tracker.track({ event: 'a' })
    tracker.track({ event: 'b' })
    tracker.track({ event: 'c' })
    vi.advanceTimersByTime(200)
    await waitForMsw()

    expect(capturedRequests).toHaveLength(1)
    const body = capturedRequests[0].body as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(3)
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
    const sendBeacon = vi.fn<Navigator['sendBeacon']>(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeacon
    })

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 0.001 }))
      .make()

    // 每条数据约 20 字节，maxBeaconSize=0.001KB ≈ 1 字节，应触发分片
    for (let i = 0; i < 5; i++) {
      tracker.track({ event: `item-${i}` })
    }

    vi.advanceTimersByTime(200)

    expect(sendBeacon).toHaveBeenCalledTimes(5)
  })
})
