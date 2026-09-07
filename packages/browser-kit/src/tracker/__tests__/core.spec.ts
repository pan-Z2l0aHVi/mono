import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests, worker } from '../../../test-helper'
import { defineTracker } from '../core'

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

/** 等待 MSW 捕获指定数量的请求；fetch → service worker 往返依赖真实时间。 */
async function waitForCaptured(minCount: number, timeout = 2000): Promise<void> {
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

describe('上报 core 测试用例', () => {
  describe('默认传输适配器（sendBeacon → fetch keepalive 降级）', () => {
    let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

    beforeEach(async () => {
      vi.restoreAllMocks()

      // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
      await settleCapturedRequests()

      vi.clearAllMocks()
      clearCapturedRequests()
      localStorage.clear()

      // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 捕获。
      sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => false)
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        enumerable: true,
        value: sendBeaconSpy
      })
    })

    it('应当调用 sendBeacon 上报数据', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'page view' })
      await waitForCaptured(1)

      expect(sendBeaconSpy).toHaveBeenCalled()
      const payload = sendBeaconSpy.mock.calls[0][1]
      expect(typeof payload).toBe('string')
      expect(payload).toContain('page view')
      expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    })

    it('sendBeacon 接受数据时不应降级到 fetch', async () => {
      sendBeaconSpy.mockReturnValue(true)

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'accepted' })
      // 排空在途请求窗口：若发生降级 fetch，会被 MSW 捕获。
      await settleCapturedRequests()

      expect(sendBeaconSpy).toHaveBeenCalledTimes(1)
      expect(JSON.parse(sendBeaconSpy.mock.calls[0][1] as string)).toEqual({ event: 'accepted' })
      expect(capturedRequests).toHaveLength(0)
    })

    it('降级策略：sendBeacon 失败时应当使用 fetch 上报数据', async () => {
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('Failed.')
      })

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'error' })
      await waitForCaptured(1)

      expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
      expect(JSON.stringify(capturedRequests[0].body)).toContain('error')
    })

    it('sendBeacon + fetch 双重失败时不应抛异常', async () => {
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('sendBeacon failed')
      })
      worker.use(http.post('*', () => HttpResponse.error()))

      const tracker = defineTracker({ url: 'https://example.com' }).make()

      expect(() => {
        tracker.track({ event: 'fail' })
      }).not.toThrow()
    })
  })

  describe('队列语义（注入 transport）', () => {
    let transport: ReturnType<typeof createTransportStub>['transport']

    beforeEach(() => {
      vi.restoreAllMocks()
      localStorage.clear()

      const stub = createTransportStub()
      transport = stub.transport
    })

    it('空数据：null 时不应调用 transport', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track(null as unknown as object)

      await settleMicrotasks()

      expect(transport).not.toHaveBeenCalled()
    })

    it('空数据：undefined 时不应调用 transport', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track(undefined as unknown as object)

      await settleMicrotasks()

      expect(transport).not.toHaveBeenCalled()
    })

    it('正常 drain 应按入队顺序串行发送', async () => {
      const order: string[] = []
      let releaseFirst!: () => void
      const firstInFlight = new Promise<void>(resolve => {
        releaseFirst = resolve
      })
      transport.mockImplementation(async item => {
        order.push((item as { event: string }).event)
        if (order.length === 1) await firstInFlight
      })

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'first' })
      tracker.track({ event: 'second' })

      await waitUntil(() => transport.mock.calls.length === 1)
      expect(order).toEqual(['first'])

      releaseFirst()
      await waitUntil(() => transport.mock.calls.length === 2)
      expect(order).toEqual(['first', 'second'])
    })

    it('请求在途时收到 resume 后失败仍应重试', async () => {
      let releaseFirst!: () => void
      const firstInFlight = new Promise<void>(resolve => {
        releaseFirst = resolve
      })
      transport.mockImplementation(async () => {
        if (transport.mock.calls.length === 1) {
          await firstInFlight
          throw new Error('first attempt failed')
        }
      })
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'retry-after-resume' })
      await waitUntil(() => transport.mock.calls.length === 1)

      tracker.resume()
      releaseFirst()

      await waitUntil(() => transport.mock.calls.length === 2)
      await waitUntil(() => defineLocal('tracker').get('queue:https://example.com') === null)

      expect(transport).toHaveBeenCalledTimes(2)
    })

    it('flush 请求在途时收到 resume 后失败仍应重试', async () => {
      let releaseFirst!: () => void
      const firstInFlight = new Promise<void>(resolve => {
        releaseFirst = resolve
      })
      transport.mockImplementation(async () => {
        if (transport.mock.calls.length === 1) {
          await firstInFlight
          throw new Error('first attempt failed')
        }
      })
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()
      tracker.track({ event: 'flush-retry-after-resume' })
      // 故意不等待：先让 flush 保持请求在途，再验证 resume() 的重试语义。
      void tracker.flush()

      await waitUntil(() => transport.mock.calls.length === 1)
      tracker.resume()
      releaseFirst()

      await waitUntil(() => transport.mock.calls.length === 2)
      await waitUntil(() => defineLocal('tracker').get('queue:https://example.com') === null)

      expect(transport).toHaveBeenCalledTimes(2)
    })

    it('暂停时 flush 会发送积压数据，但不会解除暂停', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()
      tracker.track({ event: 'first' })
      tracker.track({ event: 'second' })

      await tracker.flush()
      expect(transport).toHaveBeenCalledTimes(2)

      tracker.track({ event: 'third' })
      await settleMicrotasks()

      expect(transport).toHaveBeenCalledTimes(2)

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 3)
    })

    it('transform 函数应转换上报数据', async () => {
      const tracker = defineTracker({
        url: 'https://example.com',
        transport,
        transform: (data: object) => ({ ...data, extra: true })
      }).make()
      tracker.track({ event: 'click' })
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual({ event: 'click', extra: true })
    })
  })

  describe('持久化（注入 transport）', () => {
    const storage = defineLocal('tracker')
    let transport: ReturnType<typeof createTransportStub>['transport']

    beforeEach(() => {
      vi.restoreAllMocks()
      localStorage.clear()

      const stub = createTransportStub()
      transport = stub.transport
    })

    it('队列积压时应持久化到 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'click' }])
    })

    it('恢复的数据发送完成后从 storage 清除', async () => {
      storage.set('queue:https://example.com', [{ event: 'a' }, { event: 'b' }])

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      await waitUntil(() => storage.get('queue:https://example.com') === null)

      tracker.pause()
      tracker.track({ event: 'c' })

      expect(storage.get('queue:https://example.com')).toEqual([{ event: 'c' }])
    })

    it('同一对象引用重复 track 时应保留两条独立记录', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()

      const data = { event: 'same-reference' }
      tracker.track(data)
      tracker.track(data)

      expect(storage.get('queue:https://example.com')).toEqual([data, data])

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 2)

      expect(transport.mock.calls[0][0]).toEqual({ event: 'same-reference' })
      expect(transport.mock.calls[1][0]).toEqual({ event: 'same-reference' })
    })

    it('恢复的数据发送失败后保留在 storage，供下次启动重试', async () => {
      storage.set('queue:https://example.com', [{ event: 'sticky' }])
      transport.mockRejectedValueOnce(new Error('transport failed'))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      defineTracker({ url: 'https://example.com', transport }).make()
      // 等恢复条目的 transport rejection 完成后，断言 storage 未被清除。
      await settleMicrotasks()

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'sticky' }])
    })

    it('传输失败后 resume 会重试当前实例中的积压数据', async () => {
      let attempts = 0
      transport.mockImplementation(async () => {
        attempts += 1
        if (attempts === 1) throw new Error('first attempt failed')
      })
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'retry' })
      await waitUntil(() => attempts === 1)

      tracker.resume()
      await waitUntil(() => attempts === 2)
      await waitUntil(() => storage.get('queue:https://example.com') === null)

      expect(transport).toHaveBeenCalledTimes(2)
    })

    it('disablePersistence 时不写 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com', transport, disablePersistence: true }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toBeNull()
    })

    it('启动时应从 storage 恢复并发送', async () => {
      storage.set('queue:https://example.com', [{ event: 'restored' }])

      defineTracker({ url: 'https://example.com', transport }).make()
      // 等恢复记录被 transport 接受后，再断言传输与清空结果。
      await waitUntil(() => storage.get('queue:https://example.com') === null)

      expect(transport.mock.calls[0][0]).toEqual({ event: 'restored' })
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('发送完成后 storage 应清空', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'click' })

      await waitUntil(() => storage.get('queue:https://example.com') === null)
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('storage.set 失败时降级为内存模式，track 不抛错且只告警一次', () => {
      const setSpy = vi.spyOn(storage, 'set').mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()

      expect(() => tracker.track({ event: 'first' })).not.toThrow()
      expect(() => tracker.track({ event: 'second' })).not.toThrow()

      expect(setSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0].slice(0, 2)).toEqual([
        expect.any(Error),
        expect.stringContaining('Tracker 持久化失败')
      ])
    })

    it('storage.remove 失败时仍移除内存条目，但旧快照会残留', async () => {
      const key = 'queue:remove-failure'
      storage.set(key, [{ event: 'stale' }])
      const removeSpy = vi.spyOn(storage, 'remove').mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      defineTracker({ url: 'https://example.com', persistenceKey: 'remove-failure', transport }).make()
      await waitUntil(() => transport.mock.calls.length === 1)
      await settleMicrotasks()

      expect(removeSpy).toHaveBeenCalledTimes(1)
      expect(storage.get(key)).toEqual([{ event: 'stale' }])
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0]).toEqual([
        expect.any(Error),
        expect.stringContaining('Tracker 持久化失败'),
        expect.stringContaining(key)
      ])
    })

    it('自定义 persistenceKey 可以隔离不同 Tracker 的快照', () => {
      const first = defineTracker({ url: 'https://example.com', persistenceKey: 'first', transport }).make()
      const second = defineTracker({ url: 'https://example.com', persistenceKey: 'second', transport }).make()
      first.pause()
      second.pause()

      first.track({ event: 'first' })
      second.track({ event: 'second' })

      expect(storage.get('queue:first')).toEqual([{ event: 'first' }])
      expect(storage.get('queue:second')).toEqual([{ event: 'second' }])
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('入队时会固定数据快照，不受调用方后续修改影响', async () => {
      const tracker = defineTracker({
        url: 'https://example.com',
        persistenceKey: 'snapshot',
        transport
      }).make()
      tracker.pause()

      const data = { event: 'before', meta: { source: 'original' } }
      const expected = structuredClone(data)
      tracker.track(data)
      data.event = 'after'
      data.meta.source = 'mutated'

      expect(storage.get('queue:snapshot')).toEqual([{ event: 'before', meta: { source: 'original' } }])

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual(expected)
    })

    it('恢复快照不是数组时会丢弃并清理', () => {
      const key = 'queue:invalid-shape'
      storage.set(key, { event: 'invalid' })
      const removeSpy = vi.spyOn(storage, 'remove')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-shape', transport }).make()
      tracker.pause()

      expect(tracker).toBeDefined()
      expect(removeSpy).toHaveBeenCalledWith(key)
      expect(storage.get(key)).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('不是有效的数组'), expect.stringContaining(key))
    })

    it('恢复快照会过滤 null 和 primitive，并重新持久化合法条目', () => {
      const key = 'queue:invalid-items'
      storage.set(key, [{ event: 'valid' }, null, 'invalid', 42])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-items', transport }).make()
      tracker.pause()

      expect(tracker).toBeDefined()
      expect(storage.get(key)).toEqual([{ event: 'valid' }])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('包含无效条目'), expect.stringContaining(key))
    })
  })
})
