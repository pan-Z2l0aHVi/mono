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

/** 等待 MSW 捕获到指定数量的请求；fetch → service worker 往返依赖真实时间。 */
async function waitForCaptured(minCount: number, timeout = 2000): Promise<void> {
  const start = Date.now()
  while (capturedRequests.length < minCount && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}

describe('defineTracker 测试', () => {
  describe('默认传输适配器（sendBeacon → fetch keepalive 降级）', () => {
    let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

    beforeEach(async () => {
      vi.restoreAllMocks()
      // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空
      await settleCapturedRequests()
      vi.clearAllMocks()
      clearCapturedRequests()
      localStorage.clear()

      // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 捕获
      sendBeaconSpy = vi.fn<Navigator['sendBeacon']>(() => false)
      Object.defineProperty(navigator, 'sendBeacon', {
        configurable: true,
        enumerable: true,
        value: sendBeaconSpy
      })
    })

    it('优先用 sendBeacon 上报，并交出可解析的载荷', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'page view' })
      await waitForCaptured(1)

      // sendBeacon 在页面卸载时仍能送达，是 unload 路径唯一可靠的投递方式
      expect(sendBeaconSpy).toHaveBeenCalledTimes(1)
      expect(JSON.parse(sendBeaconSpy.mock.calls[0][1] as string)).toEqual({ event: 'page view' })
    })

    it('sendBeacon 被接受时不再额外发 fetch，避免同一条数据上报两次', async () => {
      sendBeaconSpy.mockReturnValue(true)

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'accepted' })
      await settleCapturedRequests()

      expect(capturedRequests).toHaveLength(0)
    })

    it('sendBeacon 抛错时降级到 fetch，且载荷内容一致', async () => {
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('Failed.')
      })

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'error' })
      await waitForCaptured(1)

      // 降级后数据仍要送达，只换传输方式不换内容
      expect(JSON.stringify(capturedRequests[0].body)).toContain('error')
    })

    it('两条传输都失败时静默丢弃，不打断调用方', async () => {
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('sendBeacon failed')
      })
      worker.use(http.post('*', () => HttpResponse.error()))

      const tracker = defineTracker({ url: 'https://example.com' }).make()

      // 上报是旁路能力：它的失败不该冒泡成业务异常打断用户操作
      expect(() => tracker.track({ event: 'fail' })).not.toThrow()
    })
  })

  describe('队列语义（注入 transport）', () => {
    let transport: ReturnType<typeof createTransportStub>['transport']

    beforeEach(() => {
      vi.restoreAllMocks()
      localStorage.clear()
      transport = createTransportStub().transport
    })

    it('track(null) 与 track(undefined) 是空操作，不占用一次传输', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()

      tracker.track(null as unknown as object)
      tracker.track(undefined as unknown as object)
      await settleMicrotasks()

      // 空载荷发出去会让后端收到一条无意义的记录
      expect(transport).not.toHaveBeenCalled()
    })

    it('drain 按入队顺序串行发送', async () => {
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

      // 串行而非并发：后端看到的顺序必须与用户操作顺序一致
      await waitUntil(() => transport.mock.calls.length === 1)
      expect(order).toEqual(['first'])

      releaseFirst()
      await waitUntil(() => transport.mock.calls.length === 2)
      expect(order).toEqual(['first', 'second'])
    })

    it('pause 时 flush 发送积压数据，但 pause 状态不被解除', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()
      tracker.track({ event: 'first' })
      tracker.track({ event: 'second' })

      // flush 供 beforeunload 用，必须能越过 pause 把数据送出去
      await tracker.flush()
      expect(transport).toHaveBeenCalledTimes(2)

      tracker.track({ event: 'third' })
      await settleMicrotasks()

      // 但 flush 不等于 resume：否则一次卸载就会永久破坏离线/暂停策略
      expect(transport).toHaveBeenCalledTimes(2)

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 3)
    })

    it('transform 在 track 之后、transport 之前改写载荷', async () => {
      const tracker = defineTracker({
        url: 'https://example.com',
        transport,
        transform: (data: object) => ({ ...data, extra: true })
      }).make()

      tracker.track({ event: 'click' })
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual({ event: 'click', extra: true })
    })

    it('传输失败后 resume 会重试，不静默丢事件', async () => {
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

      expect(attempts).toBe(2)
    })

    it('传输失败后队列仍然保留数据，供下次重试', async () => {
      transport.mockRejectedValue(new Error('transport failed'))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'sticky' })
      await waitUntil(() => defineLocal('tracker').get('queue:https://example.com') !== null)
      await settleMicrotasks()

      // 失败即丢等于用户行为数据静默消失；保留是重试的前提
      expect(defineLocal('tracker').get('queue:https://example.com')).toEqual([{ event: 'sticky' }])
    })

    it('请求在途时收到 resume，失败的那次仍会重试', async () => {
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

      // resume 发生在请求在途时：这条竞态曾导致失败条目被当作已确认而丢弃
      await waitUntil(() => transport.mock.calls.length === 2)
      expect(transport).toHaveBeenCalledTimes(2)
    })

    it('flush 在途时收到 resume，失败的那次仍会重试', async () => {
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
      // 故意不等：让 flush 保持请求在途，再触发 resume
      void tracker.flush()

      await waitUntil(() => transport.mock.calls.length === 1)
      tracker.resume()
      releaseFirst()

      await waitUntil(() => transport.mock.calls.length === 2)
      await waitUntil(() => defineLocal('tracker').get('queue:https://example.com') === null)
      expect(transport).toHaveBeenCalledTimes(2)
    })
  })

  describe('持久化（注入 transport）', () => {
    const storage = defineLocal('tracker')
    let transport: ReturnType<typeof createTransportStub>['transport']

    beforeEach(() => {
      vi.restoreAllMocks()
      localStorage.clear()
      transport = createTransportStub().transport
    })

    it('暂停时积压的数据落到 storage，下次启动可恢复', () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      // 队列只活在内存里，用户一关标签页就没了
      expect(storage.get('queue:https://example.com')).toEqual([{ event: 'click' }])
    })

    it('启动时从 storage 恢复并发送，发送后清空快照', async () => {
      storage.set('queue:https://example.com', [{ event: 'restored' }])

      defineTracker({ url: 'https://example.com', transport }).make()
      await waitUntil(() => storage.get('queue:https://example.com') === null)

      // 关掉页面再打开仍要补发；恢复后必须清空，否则每次启动都重复上报
      expect(transport.mock.calls[0][0]).toEqual({ event: 'restored' })
    })

    it('恢复数据发送失败时保留快照，供下次启动再试', async () => {
      storage.set('queue:https://example.com', [{ event: 'sticky' }])
      transport.mockRejectedValue(new Error('transport failed'))
      vi.spyOn(console, 'warn').mockImplementation(() => {})

      defineTracker({ url: 'https://example.com', transport }).make()
      await settleMicrotasks()

      expect(storage.get('queue:https://example.com')).toEqual([{ event: 'sticky' }])
    })

    it('同一对象重复 track 保留两条独立记录', async () => {
      // 两条记录指向同一引用：若按引用去重，第二次事件会凭空消失
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()

      const data = { event: 'same-reference' }
      tracker.track(data)
      tracker.track(data)

      expect(storage.get('queue:https://example.com')).toEqual([data, data])

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 2)
    })

    it('入队时固定数据快照，不受调用方后续修改影响', async () => {
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

      // 队列是异步发送的：入队时若只存引用，发送出去的是被改写后的内容，
      // 而落盘的快照与实际载荷还不一致
      expect(storage.get('queue:snapshot')).toEqual([{ event: 'before', meta: { source: 'original' } }])

      tracker.resume()
      await waitUntil(() => transport.mock.calls.length === 1)

      expect(transport.mock.calls[0][0]).toEqual(expected)
    })

    it('发送完成后 storage 清空', async () => {
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.track({ event: 'click' })

      // 清空是恢复逻辑的前提：不清空会让下次启动重复上报同一批数据
      await waitUntil(() => storage.get('queue:https://example.com') === null)
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('disablePersistence 时完全不写 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com', transport, disablePersistence: true }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      // 不持久化是隐私选项：写了就等于违背调用方声明
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('storage.set 失败时降级为内存模式，只告警一次且不抛错', () => {
      const setSpy = vi.spyOn(storage, 'set').mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const tracker = defineTracker({ url: 'https://example.com', transport }).make()
      tracker.pause()

      expect(() => tracker.track({ event: 'first' })).not.toThrow()
      expect(() => tracker.track({ event: 'second' })).not.toThrow()

      // 只告警一次：逐条告警会在存储满的页面上刷屏
      expect(warnSpy).toHaveBeenCalledTimes(1)
      // 降级后仍要在内存里继续攒，不能因为落盘失败就停止上报
      expect(setSpy).toHaveBeenCalledTimes(1)
    })

    it('storage.remove 失败时旧快照残留，并在告警中标明是哪个 key', async () => {
      const key = 'queue:remove-failure'
      storage.set(key, [{ event: 'stale' }])
      vi.spyOn(storage, 'remove').mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      defineTracker({ url: 'https://example.com', persistenceKey: 'remove-failure', transport }).make()
      await waitUntil(() => transport.mock.calls.length === 1)

      // 内存条目已移除但快照还在，下次启动会重复上报同一批数据；
      // 告警必须带 key，否则这个残留无从排查
      expect(storage.get(key)).toEqual([{ event: 'stale' }])
      expect(warnSpy).toHaveBeenCalledTimes(1)
      expect(warnSpy.mock.calls[0]).toEqual([
        expect.any(Error),
        expect.stringContaining('Tracker 持久化失败'),
        expect.stringContaining(key)
      ])
    })

    it('自定义 persistenceKey 让不同 Tracker 的快照互不干扰', () => {
      const first = defineTracker({ url: 'https://example.com', persistenceKey: 'first', transport }).make()
      const second = defineTracker({ url: 'https://example.com', persistenceKey: 'second', transport }).make()
      first.pause()
      second.pause()

      first.track({ event: 'first' })
      second.track({ event: 'second' })

      // 两个实例指向同一 url：共用 key 会让彼此的队列互相覆盖
      expect(storage.get('queue:first')).toEqual([{ event: 'first' }])
      expect(storage.get('queue:second')).toEqual([{ event: 'second' }])
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('恢复的快照不是数组时丢弃并清理', () => {
      const key = 'queue:invalid-shape'
      storage.set(key, { event: 'invalid' })
      const removeSpy = vi.spyOn(storage, 'remove')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-shape', transport }).make()
      tracker.pause()

      // 脏数据若被当数组用，发送时会抛在启动路径上，让整个 tracker 建不起来
      expect(tracker).toBeDefined()
      expect(removeSpy).toHaveBeenCalledWith(key)
      expect(storage.get(key)).toBeNull()
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('不是有效的数组'), expect.stringContaining(key))
    })

    it('恢复快照里的 null 与 primitive 被过滤，合法条目重新持久化', () => {
      const key = 'queue:invalid-items'
      storage.set(key, [{ event: 'valid' }, null, 'invalid', 42])
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-items', transport }).make()
      tracker.pause()

      // 脏条目若原样送出，后端收到 null / 数字；这里必须只保留合法对象并落回快照
      expect(tracker).toBeDefined()
      expect(storage.get(key)).toEqual([{ event: 'valid' }])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('包含无效条目'), expect.stringContaining(key))
    })
  })
})
