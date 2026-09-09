import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { defineTracker } from '../core'
import { defineBatchTrack } from '../plugins/batch-track'
import { definePageErrors } from '../plugins/page-errors'
import type { PageErrorsOptions } from '../plugins/page-errors'

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

describe('页面错误插件测试用例', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']
  let items: object[]
  const trackers: Array<{ stop(): void }> = []

  function makeTracker(tracker: ReturnType<typeof defineTracker>) {
    const made = tracker.make<{ stop(): void }>()
    trackers.push(made)
    return made
  }

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()

    const stub = createTransportStub()
    transport = stub.transport
    items = stub.items
  })

  afterEach(() => {
    for (const tracker of trackers) tracker.stop()
    trackers.length = 0
  })

  it('收集 uncaught error 并生成标准 page_error 事件', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          metadata: { app: 'demo' }
        })
      )
    )

    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'boom',
        filename: '/assets/app.js',
        lineno: 12,
        colno: 34,
        error: new Error('boom')
      })
    )

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    expect(payload).toMatchObject({
      event: 'page_error',
      error: {
        category: 'uncaught',
        message: 'boom',
        filename: '/assets/app.js',
        lineno: 12,
        colno: 34
      },
      metadata: { app: 'demo' }
    })
    expect(payload.error).toHaveProperty('stack')
    expect(typeof payload.timestamp).toBe('number')
  })

  it('收集 unhandled rejection 并省略 uncaught 专有字段', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('rejected')
      })
    )

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    expect(payload).toMatchObject({
      event: 'page_error',
      error: {
        category: 'unhandled_rejection',
        message: 'rejected'
      }
    })
    expect(payload.error).not.toHaveProperty('filename')
    expect(payload.error).not.toHaveProperty('lineno')
    expect(payload.error).not.toHaveProperty('colno')
  })

  it('同一签名在窗口内去重，窗口过期后允许重新上报', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    const dispatchError = () => {
      window.dispatchEvent(
        new ErrorEvent('error', {
          message: 'same',
          filename: '/assets/app.js',
          lineno: 1,
          colno: 2,
          error: new Error('same')
        })
      )
    }

    dispatchError()
    dispatchError()
    await waitUntil(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls.length).toBe(1)

    vi.advanceTimersByTime(5_000)
    dispatchError()
    await waitUntil(() => transport.mock.calls.length === 2)
  })

  it('总数限制达到上限后丢弃新错误', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          maxErrors: 1,
          dedupeWindowMs: 0
        })
      )
    )

    window.dispatchEvent(new ErrorEvent('error', { message: 'first', error: new Error('first') }))
    await waitUntil(() => transport.mock.calls.length === 1)

    window.dispatchEvent(new ErrorEvent('error', { message: 'second', error: new Error('second') }))
    await settleMicrotasks()
    expect(transport.mock.calls.length).toBe(1)
  })

  it('按配置截断 message 和 stack', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          dedupeWindowMs: 0,
          maxMessageLength: 10,
          maxStackLength: 20
        })
      )
    )

    const error = new Error('x'.repeat(30))
    error.stack = 's'.repeat(30)
    window.dispatchEvent(new ErrorEvent('error', { message: error.message, error }))

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as { error: { message: string; stack?: string } }
    expect(payload.error.message).toHaveLength(10)
    expect(payload.error.stack).toHaveLength(20)
  })

  it('metadata 求值失败时仍上报错误本体', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          metadata() {
            throw new Error('metadata failed')
          }
        })
      )
    )

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>
    expect(payload.event).toBe('page_error')
    expect(payload).not.toHaveProperty('metadata')
  })

  it('metadata getter 抛错时仍上报错误本体', async () => {
    const options: PageErrorsOptions = {}
    Object.defineProperty(options, 'metadata', {
      enumerable: true,
      get() {
        throw new Error('metadata getter failed')
      }
    })

    expect(() =>
      makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors(options)))
    ).not.toThrow()

    expect(() =>
      window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    ).not.toThrow()
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>
    expect(payload.event).toBe('page_error')
    expect(payload).not.toHaveProperty('metadata')
  })

  it('metadata 不能覆盖事件标准字段', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          metadata: () => ({ event: 'hijack', timestamp: 0, error: null })
        })
      )
    )

    window.dispatchEvent(new ErrorEvent('error', { message: 'boom', error: new Error('boom') }))
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>
    expect(payload.event).toBe('page_error')
    expect(payload.error).not.toBe(null)
    expect(typeof payload.timestamp).toBe('number')
  })

  it('stop 后停止收集页面错误', async () => {
    const tracker = makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    window.dispatchEvent(new ErrorEvent('error', { message: 'first', error: new Error('first') }))
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.stop()
    window.dispatchEvent(new ErrorEvent('error', { message: 'second', error: new Error('second') }))
    await settleMicrotasks()
    expect(transport.mock.calls.length).toBe(1)
  })

  it('stop 后停止收集 unhandled rejection', async () => {
    const tracker = makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('before stop')
      })
    )
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.stop()
    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.resolve(),
        reason: new Error('after stop')
      })
    )
    await settleMicrotasks()
    expect(transport.mock.calls.length).toBe(1)
  })

  it('非 Error 且 String(reason) 抛错时仍上报一次且不产生二次异常', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    const hostileReason = {
      toString() {
        throw new Error('cannot stringify')
      }
    }
    expect(() =>
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', {
          promise: Promise.resolve(),
          reason: hostileReason
        })
      )
    ).not.toThrow()

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as { error: { message: string } }
    expect(payload.error.message).toBe('Unknown unhandled rejection')
    await settleMicrotasks()
    expect(transport.mock.calls.length).toBe(1)
  })

  it('page error 进入 batch-track 的批量通道', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(defineBatchTrack()).use(definePageErrors())
    )

    window.dispatchEvent(new ErrorEvent('error', { message: 'batched', error: new Error('batched') }))
    vi.advanceTimersByTime(500)

    await waitUntil(() => transport.mock.calls.length === 1)
    expect(transport.mock.calls[0][0]).toEqual([
      {
        event: 'page_error',
        timestamp: expect.any(Number),
        error: expect.objectContaining({
          category: 'uncaught',
          message: 'batched'
        })
      }
    ])
  })
})
