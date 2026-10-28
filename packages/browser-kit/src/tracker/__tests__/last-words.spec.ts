import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
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

/** 记录条目的 fake transport；替代 sendBeacon 桩与 MSW 捕获。 */
function createTransportStub() {
  const items: object[] = []
  const transport = vi.fn<(item: object) => Promise<void>>(async item => {
    items.push(item)
  })
  return { items, transport }
}

const setVisibility = (state: 'hidden' | 'visible') => {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('defineLastWords 测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  })

  it('页面转入后台时立刻冲刷积压数据', async () => {
    // 移动端切走 tab 即回收页面：等到 batch 窗口到期，数据就随页面一起没了。
    // visibilitychange 是 unload 之外唯一还来得及发请求的时机。
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport }).use(defineBatchTrack()).use(defineLastWords()).make()
    )

    tracker.track({ event: 'before-close' })
    expect(transport).not.toHaveBeenCalled()

    setVisibility('hidden')

    await expectAfterDispatch(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual([{ event: 'before-close' }])
  })

  it('回到前台后重新武装，第二次切后台仍能冲刷', async () => {
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport }).use(defineBatchTrack()).use(defineLastWords()).make()
    )

    tracker.track({ event: 'first' })
    setVisibility('hidden')
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    setVisibility('visible')

    tracker.track({ event: 'second' })
    // 「只发一次」的闸门若不重置，第二次切后台就静默丢数据
    await afterDispatchTurn()
    expect(transport).toHaveBeenCalledTimes(1)

    setVisibility('hidden')
    await expectAfterDispatch(() => transport.mock.calls.length === 2)
    expect(transport.mock.calls[1][0]).toEqual([{ event: 'second' }])
  })

  it('页面转后台前已有数据被发送过，则不产生空冲刷', async () => {
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack({ defaultBatchDelay: 200 }))
        .use(defineLastWords())
        .make()
    )

    tracker.track({ event: 'already-sent' })
    vi.advanceTimersByTime(200)
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    setVisibility('hidden')
    await afterDispatchTurn()

    // 队列已空：再冲刷一次会白发一个请求
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('离线积压的数据在转后台时照常冲刷', async () => {
    // flush 忽略 pause 但不解除 pause：退出路径必须无视离线策略把数据交出去
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    )

    tracker.track({ action: 'offline-data' })
    await afterDispatchTurn()
    expect(transport).not.toHaveBeenCalled()

    setVisibility('hidden')

    await expectAfterDispatch(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual([{ action: 'offline-data' }])
  })

  it('beforeunload 与 pagehide 也走同一条冲刷路径', () => {
    // 三条退出路径必须等价：漏掉任一条，对应浏览器上就会丢数据
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport }).use(defineBatchTrack()).use(defineLastWords()).make()
    )

    tracker.track({ event: 'unloading' })

    expect(() => window.dispatchEvent(new Event('beforeunload'))).not.toThrow()
    expect(transport).toHaveBeenCalledTimes(1)

    // hasSent 闸门：同一次退出只发一次
    expect(() => window.dispatchEvent(new Event('pagehide'))).not.toThrow()
    expect(transport).toHaveBeenCalledTimes(1)
  })

  it('未组合 flush 能力的插件时退出路径不报错', () => {
    // last-words 通过 ctx.flush?.() 调能力；没有 flush 时必须空转而不是抛错
    expect(() => {
      using(defineTracker({ url: 'https://example.com', transport }).use(defineLastWords()).make())
      window.dispatchEvent(new Event('beforeunload'))
    }).not.toThrow()
  })
})
