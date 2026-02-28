import { createBatchingEmitter, make } from '@mono/utils-core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createLeaveSend, createOfflineRestore, createTracker, createTransport } from '..'

vi.mock('idb-keyval', () => ({
  update: vi.fn(async (_key, fn) => fn([])),
  get: vi.fn(async () => []),
  del: vi.fn(async () => {})
}))

vi.mock('nanoid', () => ({
  nanoid: () => 'mock-id'
}))

vi.mock('@/shortcut', () => ({
  on: (target: Window | Document, event: string, handler: () => void) => {
    target.addEventListener(event, handler)
  }
}))

describe('埋点上报工具 Tracker 单元测试', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn>
  let fetchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sendBeaconSpy = vi.fn(() => true)
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      enumerable: true,
      value: sendBeaconSpy
    })

    fetchSpy = vi.fn(() => Promise.resolve({ ok: true }))
    ;(global as any).fetch = fetchSpy
  })

  it('应当能够通过插件方式注册功能', () => {
    const trackerPlugin = createTracker()
      .use(createTransport({ url: 'https://example.com' }))
      .use(createOfflineRestore())
      .use(createBatchingEmitter())
      .use(createLeaveSend())

    const tracker = make(trackerPlugin)

    expect(typeof tracker.track).toBe('function')
    expect(typeof tracker.flush).toBe('function')
  })

  it('批量聚合：在延迟内合并多次上报', async () => {
    const trackerPlugin = createTracker()
      .use(createTransport({ url: 'https://example.com' }))
      .use(createBatchingEmitter())
    const tracker = make(trackerPlugin)

    await tracker.track({ event: 'click' })
    await tracker.track({ event: 'view' })

    tracker.flush()

    // 给一点点 buffer 时间让异步任务（如 persist/send）执行完
    await new Promise(r => setTimeout(r, 10))

    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('降级策略：sendBeacon 失败时使用 fetch', async () => {
    const trackerPlugin = createTracker().use(createTransport({ url: 'https://example.com' }))
    const tracker = make(trackerPlugin)
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })
    await tracker.track({ event: 'error' }, false)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('数据分片：超过阈值时递归分片', async () => {
    const trackerPlugin = createTracker().use(createTransport({ url: 'https://example.com' }))
    const tracker = make(trackerPlugin)
    const bigParams = Array.from({ length: 200 }, (_, i) => ({ idx: i }))
    await tracker.track({ big: bigParams })
    expect(sendBeaconSpy).toHaveBeenCalled()
  })

  it('临终遗言：beforeunload 触发立即上报', async () => {
    const trackerPlugin = createTracker()
      .use(createTransport({ url: 'https://example.com' }))
      .use(createOfflineRestore())
      .use(createBatchingEmitter())
      .use(createLeaveSend())
    const tracker = make(trackerPlugin)
    await tracker.track({ event: 'leave' })
    window.dispatchEvent(new Event('beforeunload'))
    expect(sendBeaconSpy).toHaveBeenCalled()
  })
})
