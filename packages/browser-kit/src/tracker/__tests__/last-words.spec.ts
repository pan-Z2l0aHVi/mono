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

describe('亡语插件测试用例', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()

    const stub = createTransportStub()
    transport = stub.transport

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      configurable: true
    })
  })

  it('track 数据按 batch 周期发送，插件注册不抛异常', async () => {
    // 真实 beforeunload 会在浏览器进入卸载流程时让传输请求挂起，
    // 因此这里不派发 beforeunload；beforeunload 触发的是 flush 路径，
    // 由下方 flush 用例覆盖。
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'before-close' })
    vi.advanceTimersByTime(500)
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'before-close' }])

    // 插件注册后仍可继续 track，不应报错
    tracker.track({ event: 'new-data' })
    vi.advanceTimersByTime(500)
    await waitUntil(() => transport.mock.calls.length === 2)

    expect(transport.mock.calls[1][0]).toEqual([{ event: 'new-data' }])
  })

  it('flush 立即发送积压数据（beforeunload 内部调用的路径）', async () => {
    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineLastWords())
      .make()

    tracker.track({ event: 'queued' })
    await tracker.flush()

    expect(transport.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('hasSent 在页面重新可见时应重置', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    const tracker = defineTracker({ url: 'https://example.com', transport })
      .use(defineBatchTrack())
      .use(defineOfflineRestore())
      .use(defineLastWords())
      .make()

    // 离线时 track，数据积压
    tracker.track({ event: 'first' })
    await settleMicrotasks()
    expect(transport).not.toHaveBeenCalled()

    // 第一次 hidden → flush 积压数据
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitUntil(() => transport.mock.calls.length === 1)

    expect(transport.mock.calls[0][0]).toEqual([{ event: 'first' }])

    // 页面重新可见 → 重置 hasSent
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))

    // flush 保持暂停状态，无需再次触发离线事件。

    // 再次离线 track
    tracker.track({ event: 'second' })
    await settleMicrotasks()
    expect(transport).toHaveBeenCalledTimes(1)

    // 第二次 hidden → 应再次 flush
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    await waitUntil(() => transport.mock.calls.length === 2)

    expect(transport.mock.calls[1][0]).toEqual([{ event: 'second' }])
  })

  it('无 flush 方法时不应报错', () => {
    expect(() => {
      defineTracker({ url: 'https://example.com', transport }).use(defineLastWords()).make()

      window.dispatchEvent(new Event('beforeunload'))
    }).not.toThrow()
  })
})
