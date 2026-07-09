import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineBatchTrack } from '../plugins/batch-track'
import { defineTracker } from '../plugins/core'
import { defineFailureRetry } from '../plugins/failure-retry'

// 模拟 idb-keyval（failure-retry 插件依赖）
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn(async key => _mockStore[key]),
  del: vi.fn(async key => {
    delete _mockStore[key]
  }),
  set: vi.fn(async (key, val) => {
    _mockStore[key] = val
  })
}))

describe('批量聚合上报测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    _mockStore = {}

    sendBeaconSpy = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    fetchSpy = vi.fn(() => Promise.resolve({ ok: true }))
    ;(global as any).fetch = fetchSpy
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
})
