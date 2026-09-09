import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'

vi.useFakeTimers()

/** 记录条目的 fake transport；替代 sendBeacon 桩与 MSW 捕获。 */
function createTransportStub() {
  const items: object[] = []
  const transport = vi.fn<(item: object) => Promise<void>>(async item => {
    items.push(item)
  })
  return { items, transport }
}

/**
 * 注入 fake transport 后，队列调度只经过 microtask；自旋等待断言条件收敛，
 * 不依赖真实时间。超过上限视为未收敛，让断言以超时信息失败。
 */
async function waitUntil(predicate: () => boolean, maxSpins = 1000): Promise<void> {
  for (let spin = 0; spin < maxSpins && !predicate(); spin += 1) {
    await Promise.resolve()
  }
  expect(predicate(), '等待队列调度收敛超时').toBe(true)
}

describe('聚合上报测试用例', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()

    const stub = createTransportStub()
    transport = stub.transport
  })

  it('批量聚合：在延迟内合并多次上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    tracker.track({ event: 'view' })

    expect(transport).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }, { event: 'view' }])
  })

  it('数据分片：超过阈值时分片生效', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    const totalCount = 10000
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length >= 1)

    // 分片生效：请求 payload 是部分数据（不是全部），证明递归分片切分了批次
    const body = transport.mock.calls[0][0] as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body.length).toBeLessThan(totalCount)
  })

  it('分片后所有数据无丢失（transport 累计条数一致）', async () => {
    // fake transport 同步记录每个分片，不依赖浏览器并发请求行为。
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    const totalCount = 10000
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view' })
    }

    vi.advanceTimersByTime(200)

    // 常规 drain 按顺序确认每个分片；等待全部分片送达后再统计。
    const deliveredCount = () => transport.mock.calls.reduce((total, call) => total + (call[0] as unknown[]).length, 0)
    await waitUntil(() => deliveredCount() >= totalCount)

    expect(transport.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(deliveredCount()).toBe(totalCount)
  })

  it('flush 应立即发送批量数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'queued' })
    await tracker.flush()

    expect(transport.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('batchDelay <= 0 时应立即上报，不经过批处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'immediate' }, 0)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ event: 'immediate' })
  })

  it('defaultBatchDelay=0 时不延迟，直接上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 0 }))
      .make()

    tracker.track({ event: 'instant-1' })
    // defaultBatchDelay=0 时 track 使用 setTimeout(0)，advance 任意正数即可触发
    vi.advanceTimersByTime(1)
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.track({ event: 'instant-2' })
    vi.advanceTimersByTime(1)
    await waitUntil(() => transport.mock.calls.length === 2)

    // 两条数据应该被分两次单独发送（不经过批处理合并）
    expect(transport).toHaveBeenCalledTimes(2)
  })

  it('未超过 maxBatchKB 时整批单次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBatchKB: 64 }))
      .make()

    // 3 条小数据总大小远小于 64KB，flush 时 sliceTrack 判断不超限，整批单次发送
    tracker.track({ event: 'a' })
    tracker.track({ event: 'b' })
    tracker.track({ event: 'c' })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport).toHaveBeenCalledTimes(1)
    const body = transport.mock.calls[0][0] as unknown[]
    expect(Array.isArray(body)).toBe(true)
    expect(body).toHaveLength(3)
  })

  it('单条数据应直接发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'single' })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('自定义 maxBatchKB 应生效', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBatchKB: 0.001 }))
      .make()

    // 每条数据约 20 字节，maxBatchKB=0.001KB ≈ 1 字节，应触发分片
    for (let i = 0; i < 5; i++) {
      tracker.track({ event: `item-${i}` })
    }

    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 5)

    expect(transport).toHaveBeenCalledTimes(5)
  })
})
