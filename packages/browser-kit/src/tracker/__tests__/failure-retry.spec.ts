import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../plugins/core'
import { defineFailureRetry } from '../plugins/failure-retry'

// 模拟 idb-keyval
let _mockStore: Record<string, any> = {}

vi.mock('idb-keyval', () => ({
  get: vi.fn<(key: string) => Promise<any>>(async key => _mockStore[key]),
  del: vi.fn<(key: string) => Promise<void>>(async key => {
    delete _mockStore[key]
  }),
  set: vi.fn<(key: string, val: any) => Promise<void>>(async (key, val) => {
    _mockStore[key] = val
  }),
  update: vi.fn<(key: string, updater: (existing: any) => any) => Promise<void>>(async (key, updater) => {
    _mockStore[key] = updater(_mockStore[key])
  })
}))

describe('失败重试测试用例', () => {
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

  it('成功发送：track 正常发送数据', async () => {
    const tracker = defineTracker({ url: 'https://example.com' }).use(defineFailureRetry()).make()

    await tracker.track({ event: 'click' })

    expect(sendBeaconSpy).toHaveBeenCalledOnce()
  })

  it('错误传播：track 失败时调用者能 catch 到错误', async () => {
    sendBeaconSpy.mockReturnValue(false)
    fetchSpy.mockRejectedValue(new Error('Network error'))

    const tracker = defineTracker({ url: 'https://example.com' }).use(defineFailureRetry()).make()

    // track 失败应该抛出错误
    await expect(tracker.track({ event: 'click' })).rejects.toThrow('Network error')
  })

  it('失败入队：track 失败时数据持久化到 IndexedDB', async () => {
    sendBeaconSpy.mockReturnValue(false)
    fetchSpy.mockRejectedValue(new Error('Network error'))

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    try {
      await tracker.track({ event: 'click' })
    } catch {
      // 预期的错误
    }

    // 数据应该持久化到 IndexedDB
    expect(_mockStore['test-retry']).toEqual([{ event: 'click' }])
  })

  it('成功触发重试：下次成功时自动重试队列中的数据', async () => {
    sendBeaconSpy.mockReturnValue(false)

    // 第一次：fetch 失败 → 入队
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    // 第二次：fetch 成功 → 触发重试
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)
    // 重试队列：fetch 成功
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    try {
      await tracker.track({ event: 'click' })
    } catch {
      /* 预期的错误 */
    }

    await tracker.track({ event: 'view' })

    // 等待异步重试完成
    await new Promise(r => setTimeout(r, 50))

    // 3次调用：第1次失败 + 第2次成功 + 重试成功
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    // 队列已清空
    expect(_mockStore['test-retry']).toBeUndefined()
  })

  it('重试失败：数据放回队列等待下次触发', async () => {
    sendBeaconSpy.mockReturnValue(false)

    // 第一次：fetch 失败 → 入队
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    // 第二次：fetch 成功 → 触发重试
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)
    // 重试队列：fetch 失败 → 放回队列
    fetchSpy.mockRejectedValueOnce(new Error('Still failing'))

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    try {
      await tracker.track({ event: 'click' })
    } catch {
      /* 预期的错误 */
    }

    await tracker.track({ event: 'view' })

    // 等待异步重试完成
    await new Promise(r => setTimeout(r, 50))

    // 3次调用：第1次失败 + 第2次成功 + 重试失败
    expect(fetchSpy).toHaveBeenCalledTimes(3)
    // 数据仍在队列中
    expect(_mockStore['test-retry']).toEqual([{ event: 'click' }])
  })

  it('多次失败：所有失败数据在下次成功时重试', async () => {
    sendBeaconSpy.mockReturnValue(false)

    // 前两次：fetch 失败
    fetchSpy.mockRejectedValueOnce(new Error('Error 1'))
    fetchSpy.mockRejectedValueOnce(new Error('Error 2'))
    // 第三次：fetch 成功 → 触发重试
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)
    // 重试队列：两次成功
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)
    fetchSpy.mockResolvedValueOnce({ ok: true } as Response)

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    try {
      await tracker.track({ event: 'a' })
    } catch {
      /* 预期的错误 */
    }

    try {
      await tracker.track({ event: 'b' })
    } catch {
      /* 预期的错误 */
    }

    await tracker.track({ event: 'c' })

    // 等待异步重试完成
    await new Promise(r => setTimeout(r, 50))

    // 5次调用：3次 track + 2次重试
    expect(fetchSpy).toHaveBeenCalledTimes(5)
  })

  it('并发安全：多个 track 成功不会重复重试队列', async () => {
    // sendBeacon 失败，fallback 到 fetch（使 track 变成异步）
    sendBeaconSpy.mockReturnValue(false)

    // 第一次 fetch 失败 → 入队
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    // 后续 fetch 成功，但加延迟模拟真实网络
    fetchSpy.mockImplementation(() => new Promise(r => setTimeout(() => r({ ok: true } as Response), 10)))

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    // 先让一个 track 失败入队
    try {
      await tracker.track({ event: 'fail' })
    } catch {
      /* 预期的错误 */
    }

    // 并发发起多个成功的 track
    await Promise.all([tracker.track({ event: 'a' }), tracker.track({ event: 'b' }), tracker.track({ event: 'c' })])

    // 等待异步重试完成
    await new Promise(r => setTimeout(r, 200))

    // 期望：1次失败 + 3次成功 + 1次重试 = 5次（不是7次）
    expect(fetchSpy).toHaveBeenCalledTimes(5)
  })

  it('flush：尝试发送待重试数据并清空队列', async () => {
    sendBeaconSpy.mockReturnValue(false)
    // 第一次 fetch 失败 → 入队
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))
    // flush 时的重试成功
    fetchSpy.mockResolvedValue({ ok: true } as Response)

    const tracker = defineTracker({ url: 'https://example.com' })
      .use(defineFailureRetry({ restoreKey: 'test-retry' }))
      .make()

    try {
      await tracker.track({ event: 'click' })
    } catch {
      /* 预期的错误 */
    }

    // 验证数据已持久化
    expect(_mockStore['test-retry']).toBeDefined()

    const callsBeforeFlush = fetchSpy.mock.calls.length

    // flush 应该尝试发送待重试数据
    tracker.flush()

    // 等待异步发送完成
    await new Promise(r => setTimeout(r, 50))

    // 应该有新的 fetch 调用（重试发送）
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBeforeFlush)

    // IndexedDB 应该被清空
    expect(_mockStore['test-retry']).toBeUndefined()
  })
})
