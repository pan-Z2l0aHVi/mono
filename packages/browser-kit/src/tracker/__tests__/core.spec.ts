import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineLocal } from '@/storage'

import { capturedRequests, clearCapturedRequests, settleCapturedRequests, worker } from '../../../test-helper'
import { defineTracker } from '../core'

vi.useFakeTimers()

/** 临时切换到真实计时器，轮询断言条件直到满足或超时。 */
async function waitFor(predicate: () => boolean, timeout = 5000) {
  vi.useRealTimers()
  const start = Date.now()
  while (!predicate() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  vi.useFakeTimers()
}

/** 等待 MSW 捕获指定数量的请求。 */
async function waitForMsw(minCount = 1, timeout = 5000) {
  await waitFor(() => capturedRequests.length >= minCount, timeout)
}

/** 等待 storage 收敛到目标状态。 */
async function waitForStorage(predicate: () => boolean, timeout = 5000) {
  await waitFor(predicate, timeout)
}

describe('上报 core 测试用例', () => {
  let sendBeaconSpy: ReturnType<typeof vi.fn<Navigator['sendBeacon']>>

  beforeEach(async () => {
    vi.restoreAllMocks()

    // 上一用例的在途请求可能在本用例断言窗口才落地，排空后再清空。
    await settleCapturedRequests()

    vi.clearAllMocks()
    clearCapturedRequests()
    localStorage.clear()

    // sendBeacon 始终返回 false，强制走 fetch 降级，由 MSW 拦截。
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
    await waitForMsw()

    expect(sendBeaconSpy).toHaveBeenCalled()
    const payload = sendBeaconSpy.mock.calls[0][1]
    expect(typeof payload).toBe('string')
    expect(payload).toContain('page view')
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
  })

  it('降级策略：sendBeacon 失败时应当使用 fetch 上报数据', async () => {
    sendBeaconSpy.mockImplementation(() => {
      throw new Error('Failed.')
    })

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'error' })
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(capturedRequests[0].body)).toContain('error')
  })

  it('空数据：null 时不应调用 sendBeacon', () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(null as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
  })

  it('空数据：undefined 时不应调用 sendBeacon', () => {
    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track(undefined as unknown as object)

    expect(sendBeaconSpy).not.toHaveBeenCalled()
    expect(capturedRequests).toHaveLength(0)
  })

  describe('持久化', () => {
    const storage = defineLocal('tracker')

    it('队列积压时应持久化到 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'click' }])
    })

    it('恢复的数据发送完成后从 storage 清除', async () => {
      storage.set('queue:https://example.com', [{ event: 'a' }, { event: 'b' }])

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      await waitForStorage(() => storage.get('queue:https://example.com') === null)

      tracker.pause()
      tracker.track({ event: 'c' })

      expect(storage.get('queue:https://example.com')).toEqual([{ event: 'c' }])
    })

    it('同一对象引用重复 track 时应保留两条独立记录', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.pause()

      const data = { event: 'same-reference' }
      tracker.track(data)
      tracker.track(data)

      expect(storage.get('queue:https://example.com')).toEqual([data, data])

      tracker.resume()
      await waitForMsw(2)
      await waitForStorage(() => storage.get('queue:https://example.com') === null)

      expect(capturedRequests.filter(request => JSON.stringify(request.body).includes('same-reference'))).toHaveLength(
        2
      )
    })

    it('恢复的数据发送失败后保留在 storage，供下次启动重试', async () => {
      storage.set('queue:https://example.com', [{ event: 'sticky' }])
      sendBeaconSpy.mockImplementation(() => {
        throw new Error('sendBeacon failed')
      })
      worker.use(http.post('*', () => HttpResponse.error()))

      defineTracker({ url: 'https://example.com' }).make()
      // 等待 fetch 降级路径失败（reject）完成后，断言 storage 未被清除。
      vi.useRealTimers()
      await new Promise(resolve => setTimeout(resolve, 200))
      vi.useFakeTimers()

      const stored = storage.get('queue:https://example.com')
      expect(stored).toEqual([{ event: 'sticky' }])
    })

    it('传输失败后 resume 会重试当前实例中的积压数据', async () => {
      let attempts = 0
      worker.use(
        http.post('*', () => {
          attempts += 1
          return attempts === 1 ? HttpResponse.error() : HttpResponse.json({ ok: true })
        })
      )

      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'retry' })
      await waitFor(() => attempts === 1)

      tracker.resume()
      await waitFor(() => attempts === 2)
      await waitForStorage(() => storage.get('queue:https://example.com') === null)

      expect(sendBeaconSpy).toHaveBeenCalledTimes(2)
    })

    it('disablePersistence 时不写 storage', () => {
      const tracker = defineTracker({ url: 'https://example.com', disablePersistence: true }).make()
      tracker.pause()
      tracker.track({ event: 'click' })

      const stored = storage.get('queue:https://example.com')
      expect(stored).toBeNull()
    })

    it('启动时应从 storage 恢复并发送', async () => {
      storage.set('queue:https://example.com', [{ event: 'restored' }])

      defineTracker({ url: 'https://example.com' }).make()
      // 等恢复记录发送并被浏览器运输层接受后，再断言请求与清空结果。
      await waitForStorage(() => storage.get('queue:https://example.com') === null)

      expect(capturedRequests.some(request => JSON.stringify(request.body).includes('restored'))).toBe(true)
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('发送完成后 storage 应清空', async () => {
      const tracker = defineTracker({ url: 'https://example.com' }).make()
      tracker.track({ event: 'click' })

      await waitForStorage(() => storage.get('queue:https://example.com') === null)
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('storage.set 失败时降级为内存模式，track 不抛错且只告警一次', () => {
      const setSpy = vi.spyOn(storage, 'set').mockReturnValue(false)
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const tracker = defineTracker({ url: 'https://example.com' }).make()
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
      sendBeaconSpy.mockReturnValue(true)

      defineTracker({ url: 'https://example.com', persistenceKey: 'remove-failure' }).make()
      await waitFor(() => sendBeaconSpy.mock.calls.length === 1)
      await settleCapturedRequests()

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
      const first = defineTracker({ url: 'https://example.com', persistenceKey: 'first' }).make()
      const second = defineTracker({ url: 'https://example.com', persistenceKey: 'second' }).make()
      first.pause()
      second.pause()

      first.track({ event: 'first' })
      second.track({ event: 'second' })

      expect(storage.get('queue:first')).toEqual([{ event: 'first' }])
      expect(storage.get('queue:second')).toEqual([{ event: 'second' }])
      expect(storage.get('queue:https://example.com')).toBeNull()
    })

    it('入队时会固定数据快照，不受调用方后续修改影响', async () => {
      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'snapshot' }).make()
      tracker.pause()

      const data = { event: 'before', meta: { source: 'original' } }
      const expected = structuredClone(data)
      tracker.track(data)
      data.event = 'after'
      data.meta.source = 'mutated'

      expect(storage.get('queue:snapshot')).toEqual([{ event: 'before', meta: { source: 'original' } }])

      sendBeaconSpy.mockReturnValue(true)
      tracker.resume()
      await waitFor(() => sendBeaconSpy.mock.calls.length === 1)

      expect(JSON.parse(sendBeaconSpy.mock.calls[0][1] as string)).toEqual(expected)
    })

    it('恢复快照不是数组时会丢弃并清理', () => {
      const key = 'queue:invalid-shape'
      storage.set(key, { event: 'invalid' })
      const removeSpy = vi.spyOn(storage, 'remove')
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-shape' }).make()
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

      const tracker = defineTracker({ url: 'https://example.com', persistenceKey: 'invalid-items' }).make()
      tracker.pause()

      expect(tracker).toBeDefined()
      expect(storage.get(key)).toEqual([{ event: 'valid' }])
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('包含无效条目'), expect.stringContaining(key))
    })
  })

  it('正常 drain 应按入队顺序串行发送', async () => {
    let requestCount = 0
    let releaseFirstRequest!: () => void
    const firstRequest = new Promise<void>(resolve => {
      releaseFirstRequest = resolve
    })

    worker.use(
      http.post('*', async () => {
        requestCount += 1
        if (requestCount === 1) await firstRequest
        return HttpResponse.json({ ok: true })
      })
    )

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'first' })
    tracker.track({ event: 'second' })

    await waitFor(() => requestCount === 1)
    expect(requestCount).toBe(1)

    releaseFirstRequest()
    await waitFor(() => requestCount === 2)
  })

  it('请求在途时收到 resume 后失败仍应重试', async () => {
    let requestCount = 0
    let releaseFirstRequest!: () => void
    const firstRequest = new Promise<void>(resolve => {
      releaseFirstRequest = resolve
    })

    worker.use(
      http.post('*', async () => {
        requestCount += 1
        if (requestCount === 1) {
          await firstRequest
          return HttpResponse.error()
        }
        return HttpResponse.json({ ok: true })
      })
    )

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.track({ event: 'retry-after-resume' })
    await waitFor(() => requestCount === 1)

    tracker.resume()
    releaseFirstRequest()

    await waitFor(() => requestCount === 2)
    await waitForStorage(() => defineLocal('tracker').get('queue:https://example.com') === null)

    expect(sendBeaconSpy).toHaveBeenCalledTimes(2)
  })

  it('flush 请求在途时收到 resume 后失败仍应重试', async () => {
    let requestCount = 0
    let releaseFirstRequest!: () => void
    const firstRequest = new Promise<void>(resolve => {
      releaseFirstRequest = resolve
    })

    worker.use(
      http.post('*', async () => {
        requestCount += 1
        if (requestCount === 1) {
          await firstRequest
          return HttpResponse.error()
        }
        return HttpResponse.json({ ok: true })
      })
    )

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.pause()
    tracker.track({ event: 'flush-retry-after-resume' })
    // 故意不等待：先让 flush 保持请求在途，再验证 resume() 的重试语义。
    void tracker.flush()

    await waitFor(() => requestCount === 1)
    tracker.resume()
    releaseFirstRequest()

    await waitFor(() => requestCount === 2)
    await waitForStorage(() => defineLocal('tracker').get('queue:https://example.com') === null)

    expect(sendBeaconSpy).toHaveBeenCalledTimes(2)
  })

  it('暂停时 flush 会发送积压数据，但不会解除暂停', async () => {
    sendBeaconSpy.mockReturnValue(true)

    const tracker = defineTracker({ url: 'https://example.com' }).make()
    tracker.pause()
    tracker.track({ event: 'first' })
    tracker.track({ event: 'second' })

    await tracker.flush()
    expect(sendBeaconSpy).toHaveBeenCalledTimes(2)

    await Promise.resolve()
    await Promise.resolve()
    tracker.track({ event: 'third' })
    await Promise.resolve()
    await Promise.resolve()

    expect(sendBeaconSpy).toHaveBeenCalledTimes(2)

    tracker.resume()
    await waitFor(() => sendBeaconSpy.mock.calls.length === 3)
  })

  it('transform 函数应转换上报数据', async () => {
    const tracker = defineTracker({
      url: 'https://example.com',
      transform: (data: object) => ({ ...data, extra: true })
    }).make()
    tracker.track({ event: 'click' })
    await waitForMsw()

    expect(capturedRequests.length).toBeGreaterThanOrEqual(1)
    expect(JSON.stringify(capturedRequests[0].body)).toContain('"extra":true')
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
