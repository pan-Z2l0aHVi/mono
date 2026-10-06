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

describe('definePageErrors 测试', () => {
  let transport: ReturnType<typeof createTransportStub>['transport']
  const trackers: Array<{ stop(): void }> = []

  function makeTracker(tracker: ReturnType<typeof defineTracker>) {
    const made = tracker.make<{ stop(): void }>()
    trackers.push(made)
    return made
  }

  const dispatchUncaught = (detail: {
    message: string
    error: Error
    filename?: string
    lineno?: number
    colno?: number
  }) => window.dispatchEvent(new ErrorEvent('error', detail))

  beforeEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    localStorage.clear()
    transport = createTransportStub().transport
  })

  afterEach(() => {
    // 不 stop 会让监听器活到下一个用例，把两个用例的错误混进同一条记录
    for (const tracker of trackers) tracker.stop()
    trackers.length = 0
  })

  it('uncaught error 生成带来源位置的 page_error 事件', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(definePageErrors({ metadata: { app: 'demo' } }))
    )

    dispatchUncaught({
      message: 'boom',
      filename: '/assets/app.js',
      lineno: 12,
      colno: 34,
      error: new Error('boom')
    })

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    // 定位崩溃需要 filename/lineno/colno，少一个都会让用户报的错没法查
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
  })

  it('unhandled rejection 归入独立 category，且不带源码位置', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    window.dispatchEvent(
      new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error('rejected') })
    )

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    // 两类错误要能被后端分开统计，否则无法判断该修哪条链路
    expect(payload).toMatchObject({
      event: 'page_error',
      error: { category: 'unhandled_rejection', message: 'rejected' }
    })
    expect(payload.error).not.toHaveProperty('filename')
    expect(payload.error).not.toHaveProperty('lineno')
  })

  it('相同签名在窗口内去重，窗口过期后重新上报', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    const dispatchSame = () =>
      dispatchUncaught({ message: 'same', filename: '/assets/app.js', lineno: 1, colno: 2, error: new Error('same') })

    dispatchSame()
    dispatchSame()
    await waitUntil(() => transport.mock.calls.length === 1)

    // 循环里抛同一个错会淹没上报配额：去重按「同类错误只报一次」
    expect(transport.mock.calls.length).toBe(1)

    vi.advanceTimersByTime(5000)
    dispatchSame()
    await waitUntil(() => transport.mock.calls.length === 2)
  })

  it('达到 maxErrors 后丢弃新错误', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({ maxErrors: 1, dedupeWindowMs: 0 })
      )
    )

    dispatchUncaught({ message: 'first', error: new Error('first') })
    await waitUntil(() => transport.mock.calls.length === 1)

    dispatchUncaught({ message: 'second', error: new Error('second') })
    await settleMicrotasks()

    // 上限存在是为了保护上报通道本身不被错误风暴打垮
    expect(transport.mock.calls.length).toBe(1)
  })

  it('按配置截断 message 与 stack', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({ dedupeWindowMs: 0, maxMessageLength: 10, maxStackLength: 20 })
      )
    )

    const error = new Error('x'.repeat(30))
    error.stack = 's'.repeat(30)
    dispatchUncaught({ message: error.message, error })

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as { error: { message: string; stack?: string } }

    // 截断是为了控制单次载荷体积；写死不截断会让上报请求本身超限
    expect(payload.error.message).toHaveLength(10)
    expect(payload.error.stack).toHaveLength(20)
  })

  it('metadata 求值抛错时仍上报错误本体', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          metadata() {
            throw new Error('metadata failed')
          }
        })
      )
    )

    dispatchUncaught({ message: 'boom', error: new Error('boom') })
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    // metadata 是增强信息：它坏掉不该连累最关键的那条错误记录
    expect(payload.event).toBe('page_error')
    expect(payload).not.toHaveProperty('metadata')
  })

  it('metadata 是 throwing getter 时，构造插件与派发事件都不抛错', async () => {
    const options: PageErrorsOptions = {}
    Object.defineProperty(options, 'metadata', {
      enumerable: true,
      get() {
        throw new Error('metadata getter failed')
      }
    })

    // options 不展开进插件配置：throwing getter 在构造期就会炸掉整个 tracker
    expect(() =>
      makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors(options)))
    ).not.toThrow()

    dispatchUncaught({ message: 'boom', error: new Error('boom') })
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>
    expect(payload.event).toBe('page_error')
    expect(payload).not.toHaveProperty('metadata')
  })

  it('metadata 不能覆盖事件的标准字段', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(
        definePageErrors({
          metadata: () => ({ event: 'hijack', timestamp: 0, error: null })
        })
      )
    )

    dispatchUncaught({ message: 'boom', error: new Error('boom') })
    await waitUntil(() => transport.mock.calls.length === 1)

    const payload = transport.mock.calls[0][0] as Record<string, unknown>

    // 标准字段被覆盖会让后端把一条崩溃记录当成任意事件解析，错误彻底不可用
    expect(payload.event).toBe('page_error')
    expect(payload.error).not.toBeNull()
  })

  it('reason 无法字符串化时上报占位文案，且不产生二次异常', async () => {
    makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    // 第三方代码抛出的对象 toString 可能抛错：错误上报器自己绝不能因此再抛一次
    const hostileReason = {
      toString() {
        throw new Error('cannot stringify')
      }
    }
    expect(() =>
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: hostileReason })
      )
    ).not.toThrow()

    await waitUntil(() => transport.mock.calls.length === 1)
    const payload = transport.mock.calls[0][0] as { error: { message: string } }
    expect(payload.error.message).toBe('Unknown unhandled rejection')

    await settleMicrotasks()
    expect(transport.mock.calls.length).toBe(1)
  })

  it('stop 后不再收集 uncaught error', async () => {
    const tracker = makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    dispatchUncaught({ message: 'first', error: new Error('first') })
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.stop()
    dispatchUncaught({ message: 'second', error: new Error('second') })
    await settleMicrotasks()

    // stop 之后仍上报：被卸载的组件会继续制造噪音
    expect(transport.mock.calls.length).toBe(1)
  })

  it('stop 后不再收集 unhandled rejection', async () => {
    const tracker = makeTracker(defineTracker({ url: 'https://example.com', transport }).use(definePageErrors()))

    const dispatchRejection = (reason: string) =>
      window.dispatchEvent(
        new PromiseRejectionEvent('unhandledrejection', { promise: Promise.resolve(), reason: new Error(reason) })
      )

    dispatchRejection('before stop')
    await waitUntil(() => transport.mock.calls.length === 1)

    tracker.stop()
    dispatchRejection('after stop')
    await settleMicrotasks()

    expect(transport.mock.calls.length).toBe(1)
  })

  it('page error 进入 batch-track 的批量通道', async () => {
    makeTracker(
      defineTracker({ url: 'https://example.com', transport }).use(defineBatchTrack()).use(definePageErrors())
    )

    dispatchUncaught({ message: 'batched', error: new Error('batched') })
    vi.advanceTimersByTime(500)

    await waitUntil(() => transport.mock.calls.length === 1)

    // 组合 batch-track 时错误走数组载荷：形状不一致会让后端整批解析失败，
    // 结果是崩溃记录一条都进不去
    expect(transport.mock.calls[0][0]).toEqual([
      {
        event: 'page_error',
        timestamp: expect.any(Number),
        error: expect.objectContaining({ category: 'uncaught', message: 'batched' })
      }
    ])
  })
})
