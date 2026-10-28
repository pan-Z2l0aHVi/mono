import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { defineTracker } from '../core'
import { defineOfflineRestore } from '../plugins/offline-restore'

import { expectAfterDispatch, afterDispatchTurn } from './dispatch-turn'

const cleanups: Array<() => void> = []
function using<T extends { stop(): void }>(tracker: T): T {
  cleanups.push(tracker.stop)
  return tracker
}
afterEach(() => {
  for (const stop of cleanups.splice(0)) stop()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
  localStorage.clear()
})

/** 记录条目的 fake transport；替代 sendBeacon 桩、MSW 捕获与真实时间轮询。 */
function createTransportStub() {
  const items: object[] = []
  const transport = vi.fn<(item: object) => Promise<void>>(async item => {
    items.push(item)
  })
  return { items, transport }
}

describe('defineOfflineRestore 测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('离线时数据留在队列里，不发出去', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const tracker = using(defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make())

    tracker.track({ action: 'offline-event' })
    await afterDispatchTurn()

    // 离线时发送必然失败并重试，白白消耗配额与电量
    expect(transport).not.toHaveBeenCalled()
  })

  it('在线时正常发送', async () => {
    const tracker = using(defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make())

    tracker.track({ event: 'click' })
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
  })

  it('online 事件触发 resume，积压数据按序补发', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const tracker = using(defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make())

    tracker.track({ action: 'first' })
    tracker.track({ action: 'second' })
    await afterDispatchTurn()
    expect(transport).not.toHaveBeenCalled()

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await expectAfterDispatch(() => transport.mock.calls.length === 2)

    // 重连后必须补发且保持原顺序，否则用户看到的操作序列会乱
    expect(transport.mock.calls[0][0]).toEqual({ action: 'first' })
    expect(transport.mock.calls[1][0]).toEqual({ action: 'second' })
  })

  it('启动时已离线则不补发，等到 online 后再发并清空快照', async () => {
    const storage = defineLocal('tracker')
    const storageKey = 'queue:https://example.com'
    const restored = [{ action: 'restored-while-offline' }]
    storage.set(storageKey, restored)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    using(defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make())
    await afterDispatchTurn()

    expect(transport).not.toHaveBeenCalled()
    expect(storage.get(storageKey)).toEqual(restored)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await expectAfterDispatch(() => storage.get(storageKey) === null)

    expect(transport.mock.calls[0][0]).toEqual({ action: 'restored-while-offline' })
  })

  it('多次离线/在线切换后，新一轮离线数据同样被扣住不误发', async () => {
    const tracker = using(defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).make())

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'first-offline' })
    await afterDispatchTurn()
    expect(transport).not.toHaveBeenCalled()

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await expectAfterDispatch(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual({ action: 'first-offline' })

    // 第二轮离线：resume 之后若忘记重新 pause，数据会在离线时被发出去
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    window.dispatchEvent(new Event('offline'))
    tracker.track({ action: 'second-offline' })
    await afterDispatchTurn()
    expect(transport).toHaveBeenCalledTimes(1)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    window.dispatchEvent(new Event('online'))
    await expectAfterDispatch(() => transport.mock.calls.length === 2)
    expect(transport.mock.calls[1][0]).toEqual({ action: 'second-offline' })
  })
})
