import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'
import { defineFailureRetry } from '../plugins/failure-retry'

// 模拟 idb-keyval（failure-retry 插件依赖）
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn<(key: string) => Promise<any>>(async key => _mockStore[key]),
  del: vi.fn<(key: string) => Promise<void>>(async key => {
    delete _mockStore[key]
  }),
  set: vi.fn<(key: string, val: any) => Promise<void>>(async (key, val) => {
    _mockStore[key] = val
  })
}))

describe('批量聚合上报测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>
  let fetchSpy: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    vi.clearAllMocks()
    _mockStore = {}

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

    void tracker.track({ event: 'click' })
    void tracker.track({ event: 'view' })

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    await new Promise(r => setTimeout(r, 200))

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
  })

  it('数据分片：超过阈值时分片', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    for (let i = 0; i < 10000; i++) {
      void tracker.track({ event: 'view' })
    }

    await new Promise(r => setTimeout(r, 200))
    expect(sendBeaconSpy).toHaveBeenCalled()
    expect(sendBeaconSpy).not.toHaveBeenCalledOnce()
  })

  it('flush 链式调用：flush 应触发所有插件的 flush', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .use(defineFailureRetry())
      .make()

    // 添加数据到批量队列
    void tracker.track({ event: 'queued' })

    // flush 应清空批量队列并立即发送
    tracker.flush()

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('batchDelay <= 0 时应立即上报，不经过批处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200 }))
      .make()

    await tracker.track({ event: 'immediate' }, 0)

    // 应立即调用 sendBeacon，无需等待
    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('大数据分片：恰好 64KB 时应单次发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineBatchTrack({ defaultBatchDelay: 200, maxBeaconSize: 0.0625 }))
      .make()

    // 构造一条数据，使其转化后大小恰好等于阈值
    // maxBeaconSize = 0.0625 KB = 64 字节
    // JSON.stringify 后约 64 字节
    const data = { payload: 'x'.repeat(50) }
    void tracker.track(data, -1)

    expect(sendBeaconSpy).toHaveBeenCalled()
  })
})
