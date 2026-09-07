import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { defineTracker } from '../core'
import { defineOfflineRestore } from '../plugins/offline-restore'

/** 记录条目的 fake transport；替代 sendBeacon 桩、MSW 捕获与真实时间轮询。 */
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

/** 排空已调度的 microtask，用于「没有发生 X」类断言前的收敛。 */
async function settleMicrotasks(spins = 50): Promise<void> {
  for (let spin = 0; spin < spins; spin += 1) {
    await Promise.resolve()
  }
}

describe('离线恢复上报插件测试用例', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()

    const stub = createTransportStub()
    transport = stub.transport

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  it('离线时不应发送数据', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'offline-event' })
    await settleMicrotasks()

    expect(transport).not.toHaveBeenCalled()
  })

  it('启动恢复遇到初始离线时应等到 online 后再发送', async () => {
    const storage = defineLocal('tracker')
    const storageKey = 'queue:https://example.com'
    const restored = [{ action: 'restored-while-offline' }]
    storage.set(storageKey, restored)
    Object.defineProperty(navigator, 'onLine', { value: false })

    defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()
    await settleMicrotasks()

    expect(transport).not.toHaveBeenCalled()
    expect(storage.get(storageKey)).toEqual(restored)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => storage.get(storageKey) === null)

    expect(transport.mock.calls[0][0]).toEqual({ action: 'restored-while-offline' })
    expect(storage.get(storageKey)).toBeNull()
  })

  it('离线后重连恢复：online 事件触发 resume', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await settleMicrotasks()

    expect(transport).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 2)

    expect(transport.mock.calls[0][0]).toEqual({ action: 'first' })
    expect(transport.mock.calls[1][0]).toEqual({ action: 'second' })
  })

  it('在线时正常发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ event: 'click' })
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
  })

  it('启动时离线 → 恢复在线应发送积压数据', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })

    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'pending' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ action: 'pending' })
  })

  it('多次离线/在线切换应正确处理', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    // 第一次离线。
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    // 恢复在线。
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual({ action: 'first-offline' })

    // 第二次离线。
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await settleMicrotasks()
    expect(transport).toHaveBeenCalledTimes(1)

    // 再次恢复。
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 2)

    expect(transport.mock.calls[1][0]).toEqual({ action: 'second-offline' })
  })
})
