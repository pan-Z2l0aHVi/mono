import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../plugins/core'
import { defineOfflineRestore } from '../plugins/offline-restore'

// 模拟 idb-keyval 存储
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn<(key: string) => Promise<any>>(async key => _mockStore[key]),
  del: vi.fn<(key: string) => Promise<void>>(async key => {
    delete _mockStore[key]
  }),
  update: vi.fn<(key: string, updater: (prev: any) => any) => Promise<void>>(async (key, updater) => {
    const oldValue = _mockStore[key] || []
    _mockStore[key] = updater(oldValue)
  }),
  set: vi.fn<(key: string, val: any) => Promise<void>>(async (key, val) => {
    _mockStore[key] = val
  })
}))

describe('离线恢复上报插件测试用例', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    _mockStore = {}

    if (typeof navigator !== 'undefined') {
      // 避免 core.ts 中 sendBeacon 报错
      Object.defineProperty(navigator, 'sendBeacon', {
        value: vi.fn<Navigator['sendBeacon']>(() => true),
        configurable: true
      })
      Object.defineProperty(navigator, 'onLine', {
        value: true,
        configurable: true
      })
    }
  })

  it('应当离线存储并在重连后恢复上报', async () => {
    const restoreKey = 'integrated-test'

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()

    Object.defineProperty(navigator, 'onLine', { value: false })

    const eventData = { action: 'click', timestamp: 12345 }
    await tracker.track(eventData)

    window.dispatchEvent(new Event('offline'))

    expect(_mockStore[restoreKey]).toContainEqual(eventData)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))

    // 等待异步 init() 完成
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(_mockStore[restoreKey]).toBeUndefined()
  })

  it('离线时不应调用 ctx.track 发送数据', async () => {
    const restoreKey = 'no-send-offline-test'
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()
    Object.defineProperty(navigator, 'onLine', { value: false })

    const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon')

    await tracker.track({ action: 'offline-event' })

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    sendBeaconSpy.mockRestore()
  })

  it('应当去重（deepEqual）', async () => {
    const restoreKey = 'unique-test'
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()
    Object.defineProperty(navigator, 'onLine', { value: false })

    await tracker.track({ id: 'repeat', coordinate: { x: 1, y: 2 } })
    await tracker.track({ id: 'repeat', coordinate: { x: 1, y: 2 } })

    window.dispatchEvent(new Event('offline'))

    expect(_mockStore[restoreKey]).toHaveLength(1)
    expect(_mockStore[restoreKey][0]).toEqual({ id: 'repeat', coordinate: { x: 1, y: 2 } })
  })

  it('离线时不发送：track 在离线时只入队不调用 ctx.track', async () => {
    const restoreKey = 'staged-only-test'
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()

    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon')

    await tracker.track({ action: 'offline-click' })

    expect(sendBeaconSpy).not.toHaveBeenCalled()

    // 触发 offline 事件，验证数据持久化
    window.dispatchEvent(new Event('offline'))
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(_mockStore[restoreKey]).toContainEqual({ action: 'offline-click' })

    sendBeaconSpy.mockRestore()
  })

  it('离线存储后重连恢复：offline 事件触发存储，online 事件触发恢复', async () => {
    const restoreKey = 'offline-online-test'
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineOfflineRestore({ restoreKey })).make()

    tracker.onOfflineRestore()

    // 离线并追踪数据
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    await tracker.track({ action: 'first' })
    await tracker.track({ action: 'second' })

    // 触发 offline 事件，验证数据持久化
    window.dispatchEvent(new Event('offline'))
    await new Promise(resolve => setTimeout(resolve, 10))

    expect(_mockStore[restoreKey]).toBeDefined()
    expect(_mockStore[restoreKey]).toContainEqual({ action: 'first' })
    expect(_mockStore[restoreKey]).toContainEqual({ action: 'second' })

    // 恢复在线，验证数据恢复并发送
    const sendBeaconSpy = vi.spyOn(navigator, 'sendBeacon')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })

    window.dispatchEvent(new Event('online'))

    // 等待异步 init() 完成
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(_mockStore[restoreKey]).toBeUndefined()
    expect(sendBeaconSpy).toHaveBeenCalled()

    sendBeaconSpy.mockRestore()
  })

  it('队列满：达到 restoreMaxSize 后截断旧数据', async () => {
    const restoreKey = 'max-size-test'
    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineOfflineRestore({ restoreKey, restoreMaxSize: 3 }))
      .make()

    tracker.onOfflineRestore()
    Object.defineProperty(navigator, 'onLine', { value: false })

    // 离线发送 5 条数据
    for (let i = 1; i <= 5; i++) {
      await tracker.track({ id: i })
    }

    window.dispatchEvent(new Event('offline'))
    await new Promise(resolve => setTimeout(resolve, 10))

    // 应只保留最后 3 条
    expect(_mockStore[restoreKey]).toHaveLength(3)
    expect(_mockStore[restoreKey]).toContainEqual({ id: 3 })
    expect(_mockStore[restoreKey]).toContainEqual({ id: 4 })
    expect(_mockStore[restoreKey]).toContainEqual({ id: 5 })
  })

  it('IndexedDB 不可用：init 失败时不影响正常发送', async () => {
    const { get } = await import('idb-keyval')
    vi.mocked(get).mockRejectedValueOnce(new Error('IndexedDB unavailable'))

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineOfflineRestore({ restoreKey: 'test-offline' }))
      .make()

    // 等待异步 init 完成
    await new Promise(resolve => setTimeout(resolve, 50))

    // 正常发送不受影响
    await tracker.track({ event: 'click' })

    expect(consoleSpy).toHaveBeenCalled()

    consoleSpy.mockRestore()
  })
})
