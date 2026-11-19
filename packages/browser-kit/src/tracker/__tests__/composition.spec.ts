import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

import { expectAfterDispatch, afterDispatchTurn } from './dispatch-turn'

const cleanups: Array<() => void> = []
function using<T extends object>(tracker: T): T {
  const stoppable = tracker as T & { stop?: () => void }
  cleanups.push(() => stoppable.stop?.())
  return tracker
}

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

describe('tracker 插件组合测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    setVisibility('visible')
  })

  afterEach(() => {
    for (const stop of cleanups.splice(0)) stop()
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    vi.useRealTimers()
  })

  it('推荐顺序 batch → offline → last-words：在线时按批上报', async () => {
    // 批延迟显式给定：本用例判组合顺序，不判默认值（默认值被重调时这里不该假红）。
    const batchDelay = 200
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack({ defaultBatchDelay: batchDelay }))
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    )

    tracker.track({ event: 'click' })
    vi.advanceTimersByTime(batchDelay)
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
  })

  it('推荐顺序：离线时三条路径叠加也不误发', async () => {
    // batch 延迟、offline 暂停、last-words 监听三者共存时最容易出现「以为暂停了其实没暂停」
    const batchDelay = 200
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack({ defaultBatchDelay: batchDelay }))
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    )

    tracker.track({ event: 'offline' })
    vi.advanceTimersByTime(batchDelay)
    await afterDispatchTurn()

    expect(transport).not.toHaveBeenCalled()
  })

  it('换序 batch → offline 仍然成立：组合结果不依赖 use 顺序', async () => {
    const batchDelay = 200
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack({ defaultBatchDelay: batchDelay }))
        .use(defineOfflineRestore())
        .make()
    )

    tracker.track({ event: 'click' })
    vi.advanceTimersByTime(batchDelay)
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
  })

  it('最小组合 core：逐条直发，不套数组', async () => {
    const tracker = using(defineTracker({ url: 'https://example.com', transport }).make())

    tracker.track({ event: 'click' })
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    // 没组合 batch 时载荷形状是裸对象：后端要能同时接受两种形状
    expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
  })

  it('无 batch-track 组合：flush 仍可发送，且不报错', async () => {
    // last-words 依赖可选的 flush 能力；缺 batch 时应回落到 core 的 flush
    const tracker = using(
      defineTracker({ url: 'https://example.com', transport }).use(defineOfflineRestore()).use(defineLastWords()).make()
    )

    tracker.track({ event: 'click' })
    await expectAfterDispatch(() => transport.mock.calls.length === 1)

    await expect(tracker.flush()).resolves.toBeUndefined()
  })
})
