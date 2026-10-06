import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { defineLastWords } from '../plugins/last-words'
import { defineOfflineRestore } from '../plugins/offline-restore'

vi.useFakeTimers()

/** 记录条目的 fake transport；替代 sendBeacon 桩与 MSW 捕获。 */
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

const setVisibility = (state: 'hidden' | 'visible') => {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('tracker 插件组合测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    setVisibility('visible')
  })

  it('推荐顺序 batch → offline → last-words：在线时按批上报', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'click' })
    vi.advanceTimersByTime(500)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
  })

  it('推荐顺序：离线时三条路径叠加也不误发', async () => {
    // batch 延迟、offline 暂停、last-words 监听三者共存时最容易出现「以为暂停了其实没暂停」
    Object.defineProperty(navigator, 'onLine', { value: false })
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'offline' })
    vi.advanceTimersByTime(500)
    await settleMicrotasks()

    expect(transport).not.toHaveBeenCalled()
  })

  it('推荐顺序：转后台时离线积压的数据仍被冲刷', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    tracker.track({ action: 'offline-data' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    // 退出路径无视离线暂停，把攒着的数据交出去
    setVisibility('hidden')
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ action: 'offline-data' }])
  })

  it('换序 batch → offline 仍然成立：组合结果不依赖 use 顺序', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .make()

    tracker.track({ event: 'click' })
    vi.advanceTimersByTime(500)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
  })

  it('最小组合 core：逐条直发，不套数组', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport }).make()

    tracker.track({ event: 'click' })
    await waitUntil(() => transport.mock.calls.length === 1)

    // 没组合 batch 时载荷形状是裸对象：后端要能同时接受两种形状
    expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
  })

  it('无 batch-track 组合：flush 仍可发送，且不报错', async () => {
    // last-words 依赖可选的 flush 能力；缺 batch 时应回落到 core 的 flush
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'click' })
    await waitUntil(() => transport.mock.calls.length === 1)

    await expect(tracker.flush()).resolves.toBeUndefined()
  })
})
