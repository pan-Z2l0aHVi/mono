import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'

vi.useFakeTimers()

/** 记录条目的 fake transport。批量断言只看 transport 收到什么，不关心怎么发出去。 */
function createTransportStub() {
  const items: object[] = []
  const transport = vi.fn<(item: object) => Promise<void>>(async item => {
    items.push(item)
  })
  return { items, transport }
}

/**
 * 注入 fake transport 后队列调度只经过 microtask，自旋等待即可收敛，不依赖真实时间。
 * 上限兜底：未收敛时以超时信息失败，而不是挂到 vitest 的默认超时。
 */
async function waitUntil(predicate: () => boolean, maxSpins = 1000): Promise<void> {
  for (let spin = 0; spin < maxSpins && !predicate(); spin += 1) {
    await Promise.resolve()
  }
  expect(predicate(), '等待队列调度收敛超时').toBe(true)
}

/** 各分片累计送达的条目总数。 */
const deliveredCount = (transport: ReturnType<typeof createTransportStub>['transport']) =>
  transport.mock.calls.reduce((total, call) => total + (call[0] as unknown[]).length, 0)

describe('defineBatchTrack 测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
  })

  it('窗口内的多次 track 合并成一个数组批次，保持入队顺序', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    tracker.track({ event: 'view' })

    // 延迟未到之前不得发送：合并是这个插件存在的全部意义
    expect(transport).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }, { event: 'view' }])
  })

  it('单条数据也包成数组发送，后端格式统一', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'single' })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    // 始终发数组：后端按一种格式解析，混发对象会让服务端分支漏掉单条事件
    expect(transport.mock.calls[0][0]).toEqual([{ event: 'single' }])
  })

  it('batchDelay <= 0 时逐条直发，不进批量通道', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'immediate' }, 0)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ event: 'immediate' })
  })

  it('defaultBatchDelay 为 0 时按 setTimeout(0) 逐次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 0 }))
      .make()

    tracker.track({ event: 'instant-1' })
    vi.advanceTimersByTime(1)
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.track({ event: 'instant-2' })
    vi.advanceTimersByTime(1)
    await waitUntil(() => transport.mock.calls.length === 2)

    expect(transport).toHaveBeenCalledTimes(2)
  })

  it('flush 立刻结算未到窗口的批次', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 5000 }))
      .make()

    tracker.track({ event: 'queued' })
    await tracker.flush()

    // 页面卸载时窗口永远不会到，flush 是唯一能把数据发出去的路径
    expect(transport.mock.calls[0][0]).toEqual([{ event: 'queued' }])
  })

  it('未超过 maxBatchKB 时整批一次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBatchKB: 64 }))
      .make()

    tracker.track({ event: 'a' })
    tracker.track({ event: 'b' })
    tracker.track({ event: 'c' })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toHaveLength(3)
  })

  it('超过 maxBatchKB 时二分分片，且分片后条目一条不少', async () => {
    // maxBatchKB 压到 4（≈4KB），用每条 ~600 字节的 padding 让 20 条累计超过阈值：
    // 分片正确性与条目总量无关，用尽量少的数据触发即可。之前用 2000 条触发分片，
    // 在 CI 高负载下会撞默认 15s 超时（实测 18.4s），靠加超时参数续命不是修法。
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBatchKB: 4 }))
      .make()

    const totalCount = 20
    const padding = 'x'.repeat(600)
    for (let i = 0; i < totalCount; i++) {
      tracker.track({ event: 'view', i, padding })
    }

    vi.advanceTimersByTime(200)
    await waitUntil(() => deliveredCount(transport) >= totalCount)

    // 分片数 > 1 且累计条数守恒：sendBeacon 有 64KB 上限，
    // 静默截断会让用户行为数据静默丢失且不可见
    expect(transport.mock.calls.length).toBeGreaterThan(1)
    expect(deliveredCount(transport)).toBe(totalCount)
    for (const call of transport.mock.calls) {
      expect(Array.isArray(call[0])).toBe(true)
    }
  })

  it('单条数据超过 maxBatchKB 时照发，不无限递归', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBatchKB: 0.0001 }))
      .make()

    tracker.track({ event: 'oversized', padding: 'x'.repeat(500) })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    // 单条无法再切分；best-effort 投递优于丢事件或栈溢出
    expect(transport.mock.calls[0][0]).toEqual([{ event: 'oversized', padding: 'x'.repeat(500) }])
  })

  it('transform 在批量通道之下生效，作用于整批载荷', async () => {
    const tracker = defineTracker({
      url: 'https://example.com',
      transport,
      transform: (data: object) => ({ ...data, extra: true })
    })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    tracker.track({ event: 'click' })
    vi.advanceTimersByTime(200)
    await waitUntil(() => transport.mock.calls.length === 1)

    // transform 拿到的输入是 batch-track 合并后的数组（不是逐条）：core 的
    // onConsume 只在最终载荷上跑一次 transform。写死成逐条会静默产出
    // 形状不同的载荷，后端解析随之失配。
    expect(transport.mock.calls[0][0]).toEqual({ 0: { event: 'click' }, extra: true })
  })
})
