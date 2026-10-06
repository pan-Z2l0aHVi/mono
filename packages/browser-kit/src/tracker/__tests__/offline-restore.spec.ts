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
 * 注入 fake transport 后队列调度只经过 microtask，自旋等待即可收敛，不依赖真实时间。
 * 上限兜底：未收敛时以超时信息失败，而不是挂到 vitest 的默认超时。
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

describe('defineOfflineRestore 测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  it('离线时数据留在队列里，不发出去', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'offline-event' })
    await settleMicrotasks()

    // 离线时发送必然失败并重试，白白消耗配额与电量
    expect(transport).not.toHaveBeenCalled()
  })

  it('在线时正常发送', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ event: 'click' })
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
  })

  it('online 事件触发 resume，积压数据按序补发', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 2)

    // 重连后必须补发且保持原顺序，否则用户看到的操作序列会乱
    expect(transport.mock.calls[0][0]).toEqual({ action: 'first' })
    expect(transport.mock.calls[1][0]).toEqual({ action: 'second' })
  })

  it('启动时已离线则不补发，等到 online 后再发并清空快照', async () => {
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
  })

  it('多次离线/在线切换后，新一轮离线数据同样被扣住不误发', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make()

    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual({ action: 'first-offline' })

    // 第二轮离线：resume 之后若忘记重新 pause，数据会在离线时被发出去
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await settleMicrotasks()
    expect(transport).toHaveBeenCalledTimes(1)

    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    await waitUntil(() => transport.mock.calls.length === 2)
    expect(transport.mock.calls[1][0]).toEqual({ action: 'second-offline' })
  })
})
