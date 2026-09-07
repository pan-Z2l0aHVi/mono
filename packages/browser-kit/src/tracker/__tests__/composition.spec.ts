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

describe('插件组合测试', () => {
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

  describe('推荐顺序：batch → offline → last-words', () => {
    function createTracker() {
      return defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()
    }

    it('正常上报：track 成功发送数据', async () => {
      const tracker = createTracker()
      tracker.track({ event: 'click' })
      // batch 默认延迟 500ms，advance 后由队列 drain 发送。
      vi.advanceTimersByTime(500)
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
    })

    it('离线缓存：离线时暂停 outbox，不发送数据', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const tracker = createTracker()

      tracker.track({ event: 'offline' })
      vi.advanceTimersByTime(500)
      await settleMicrotasks()

      expect(transport).not.toHaveBeenCalled()
    })

    it('临终遗言：flush 立即发送积压数据', async () => {
      // beforeunload 触发的是 flush 路径；真实页面卸载会让传输请求挂起，
      // 这里直接用 flush() 覆盖 last-words 调用的发送路径。
      const tracker = createTracker()

      tracker.track({ event: 'before-close' })
      await tracker.flush()

      expect(transport).toHaveBeenCalledTimes(1)
      expect(transport.mock.calls[0][0]).toEqual([{ event: 'before-close' }])
    })
  })

  describe('不同顺序：batch → offline', () => {
    it('仍然能正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'click' })
      vi.advanceTimersByTime(500)
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual([{ event: 'click' }])
    })

    it('离线时仍然不发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })
      const tracker = defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .make()

      tracker.track({ event: 'offline' })
      // 等待 batch delay (500ms) 触发发送尝试，确认离线时队列不消费
      vi.advanceTimersByTime(500)
      await settleMicrotasks()

      expect(transport).not.toHaveBeenCalled()
    })
  })

  describe('最小组合：只有 core', () => {
    it('正常上报', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()

      tracker.track({ event: 'click' })
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual({ event: 'click' })
    })

    it('core 有 flush 方法', () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()

      expect('flush' in tracker).toBe(true)
    })
  })

  describe('离线 + 临终遗言', () => {
    it('离线积累的数据 flush 时立即发送', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false })

      const tracker = defineTracker({ url: 'https://example.com', transport })
        .use(defineBatchTrack())
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ action: 'offline-data' })
      await settleMicrotasks()
      expect(transport).not.toHaveBeenCalled()

      // 离线积压的数据通过 flush 立即发送（beforeunload 内部调用同一路径）；
      // flush 忽略暂停状态但不解除暂停。
      await tracker.flush()

      expect(transport).toHaveBeenCalledTimes(1)
      expect(transport.mock.calls[0][0]).toEqual([{ action: 'offline-data' }])
    })
  })

  describe('无 batch-track 组合', () => {
    it('core + offline + last-words flush 不应报错', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport })
        .use(defineOfflineRestore())
        .use(defineLastWords())
        .make()

      tracker.track({ event: 'click' })
      await waitUntil(() => transport.mock.calls.length === 1)

      await expect(tracker.flush()).resolves.toBeUndefined()
    })
  })
})
