import { http, HttpResponse, type RequestHandler } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { createMswTestEnv, defineCapturedRequests, defineMsw, type MswContext } from '..'

// test-kit 在 Node 环境跑，真实 setupWorker 会抛
// "Failed to execute setupWorker in a non-browser environment"，因此桩掉 msw/browser。
// 只桩掉 service worker 的启动壳：注册进 worker 的 handler 仍是 msw 的真实 handler，
// 所以下面断言的是「哪个 handler 应答了请求」这一实际行为，而不是注册顺序。
vi.mock('msw/browser', () => ({
  setupWorker: vi.fn<(...handlers: unknown[]) => object>(() => ({
    start: vi.fn<(options?: { quiet: boolean }) => Promise<void>>().mockResolvedValue(undefined),
    stop: vi.fn<() => void>(),
    resetHandlers: vi.fn<() => void>()
  }))
}))

import { setupWorker } from 'msw/browser'

const mockedSetupWorker = vi.mocked(setupWorker)

const ORIGIN = 'https://testkit.test'

/**
 * 让 MSW handler 参与一次请求解析所需的上下文。handler 按注册顺序逐个试，
 * 首个应答者胜出——与 service worker 内部的执行顺序一致。
 */
function runHandler(handler: RequestHandler, url: string, init?: RequestInit) {
  return handler.run({
    request: new Request(`${ORIGIN}${url}`, init),
    requestId: 'testkit-request',
    resolutionContext: {
      group: 'testkit',
      quiet: true,
      onPassthroughResponse: () => {},
      onMockedResponse: () => {},
      onMockedResponseSent: () => {},
      onError: () => {},
      onUnhandledRequest: () => {}
    }
  } as unknown as Parameters<RequestHandler['run']>[0])
}

/** 按注册顺序让整条 handler 链处理一次请求，返回首个应答者，无人应答时为 null。 */
async function dispatch(url: string, init?: RequestInit) {
  const handlers = mockedSetupWorker.mock.calls.at(-1) as RequestHandler[]

  for (const handler of handlers) {
    const result = await runHandler(handler, url, init)
    // handler.run 命中时返回 { response, parsedResult }，未命中返回 null——与
    // service worker 内部「首个应答者胜出」的执行顺序一致
    if (result) return result
  }
  return null
}

/** 取出 env 注册的 handler 链里最后一个（即自动捕获 handler）。 */
function captureHandler() {
  return (mockedSetupWorker.mock.calls.at(-1) as RequestHandler[]).at(-1)!
}

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('createMswTestEnv 请求捕获', () => {
  it('业务 handler 应答的请求不被捕获', async () => {
    const env = createMswTestEnv({
      handlers: [http.get(`${ORIGIN}/api/user`, () => HttpResponse.json({ name: 'Alice' }))]
    })

    const result = await dispatch('/api/user')

    // 业务 handler 优先应答：拿到业务响应，且请求不落进捕获记录
    expect(result?.response?.status).toBe(200)
    expect(await result?.response?.clone().json()).toEqual({ name: 'Alice' })
    expect(env.capturedRequests).toHaveLength(0)
  })

  it('业务 handler 未命中的请求被自动捕获', async () => {
    const env = createMswTestEnv({
      handlers: [http.get(`${ORIGIN}/api/user`, () => HttpResponse.json({ name: 'Alice' }))]
    })

    const result = await dispatch('/api/other')

    // 落到捕获 handler：业务端点不受影响，未命中的请求留下记录
    expect(result?.response?.status).toBe(200)
    expect(env.capturedRequests).toHaveLength(1)
    expect(env.capturedRequests[0].url).toBe('/api/other')
  })

  it.each([
    {
      name: 'JSON 请求体解析为对象',
      init: { method: 'POST', body: JSON.stringify({ event: 'click' }) },
      expected: { event: 'click' }
    },
    { name: '非 JSON 请求体保留原始文本', init: { method: 'POST', body: 'not-json' }, expected: 'not-json' },
    { name: '无请求体记为 null', init: { method: 'POST' }, expected: null }
  ])('$name', async ({ init, expected }) => {
    const env = createMswTestEnv()

    await dispatch('/api/track', init)

    expect(env.capturedRequests[0].body).toEqual(expected)
  })

  it.each([
    { method: 'GET', expected: 'GET' },
    { method: 'POST', expected: 'POST' },
    { method: 'DELETE', expected: 'DELETE' }
  ])('$method 请求记录方法与 pathname', async ({ method, expected }) => {
    const env = createMswTestEnv()

    await dispatch('/api/track?query=1', { method })

    // url 记 pathname：查询串不参与匹配，消费方的断言因此不受 URL 细节影响
    expect(env.capturedRequests[0].url).toBe('/api/track')
    expect(env.capturedRequests[0].method).toBe(expected)
  })

  it('clearCapturedRequests 清空记录', () => {
    const env = createMswTestEnv()
    env.capturedRequests.push({ url: '/api/test', body: {}, method: 'POST', timestamp: 0 })
    expect(env.capturedRequests).toHaveLength(1)

    env.clearCapturedRequests()

    expect(env.capturedRequests).toHaveLength(0)
  })

  it('每次 createMswTestEnv 有独立的捕获记录', () => {
    const first = createMswTestEnv()
    const second = createMswTestEnv()

    first.capturedRequests.push({ url: '/api/test', body: {}, method: 'POST', timestamp: 0 })

    expect(first.capturedRequests).toHaveLength(1)
    expect(second.capturedRequests).toHaveLength(0)
  })
})

describe('createMswTestEnv worker 生命周期', () => {
  it('start/stop/reset 委托到 worker', async () => {
    const env = createMswTestEnv()

    await env.start()
    expect(env.worker.start).toHaveBeenCalledWith({ quiet: true })

    env.stop()
    expect(env.worker.stop).toHaveBeenCalled()

    env.reset()
    expect(env.worker.resetHandlers).toHaveBeenCalled()
  })

  it('捕获 handler 以 { ok: true } 应答，避免消费方收到未处理的请求错误', async () => {
    const env = createMswTestEnv()

    const result = await runHandler(captureHandler(), '/api/unmocked')

    expect(result?.response?.status).toBe(200)
    expect(await result?.response?.clone().json()).toEqual({ ok: true })
    expect(env.capturedRequests).toHaveLength(1)
  })
})

describe('createMswTestEnv settle', () => {
  it('等待在途请求落地后才返回', async () => {
    const env = createMswTestEnv()

    // 模拟 fire-and-forget 请求：用例已清空记录后才落地
    setTimeout(() => {
      env.capturedRequests.push({ url: '/api/late', body: {}, method: 'POST', timestamp: 0 })
    }, 10)
    await env.settle(500)

    // settle 前落地，这条残留记录就会被下一个用例的断言看到
    expect(env.capturedRequests).toHaveLength(1)
  })

  it('保留调用前的计时器状态', async () => {
    const env = createMswTestEnv()
    vi.useFakeTimers()

    await env.settle(50)

    expect(vi.isFakeTimers()).toBe(true)
  })

  it('真实计时器下调用后仍是真实计时器', async () => {
    const env = createMswTestEnv()

    await expect(env.settle(100)).resolves.toBeUndefined()

    expect(vi.isFakeTimers()).toBe(false)
  })
})

describe('defineCapturedRequests', () => {
  it('clearCapturedRequests 清空记录', () => {
    const { capturedRequests, clearCapturedRequests } = defineCapturedRequests().make()
    capturedRequests.push({ url: '/api/test', body: {}, method: 'POST', timestamp: 0 })

    clearCapturedRequests()

    expect(capturedRequests).toHaveLength(0)
  })

  it('多个实例互不共享记录', () => {
    const first = defineCapturedRequests().make()
    const second = defineCapturedRequests().make()

    first.capturedRequests.push({ url: '/api/test', body: {}, method: 'POST', timestamp: 0 })

    // 共享同一个数组会让两个环境互相污染对方的断言
    expect(first.capturedRequests).toHaveLength(1)
    expect(second.capturedRequests).toHaveLength(0)
  })
})

describe('defineMsw', () => {
  it('把 handlers 交给 worker 注册', () => {
    const handler = http.get(`${ORIGIN}/api/user`, () => HttpResponse.json({}))

    const ctx = defineMsw([handler]).make()

    expect(mockedSetupWorker).toHaveBeenCalledWith(handler)
    expect(ctx.worker).toBeDefined()
  })

  it.each([
    { name: 'startMsw', worker: 'start' as const, call: (ctx: MswContext) => ctx.startMsw() },
    { name: 'stopMsw', worker: 'stop' as const, call: (ctx: MswContext) => ctx.stopMsw() },
    { name: 'resetMsw', worker: 'resetHandlers' as const, call: (ctx: MswContext) => ctx.resetMsw() }
  ])('$name 委托到 worker 的对应方法', async ({ call, worker }) => {
    const ctx = defineMsw([]).make()

    await call(ctx)

    expect(ctx.worker[worker]).toHaveBeenCalled()
  })

  it('可与 defineCapturedRequests 组合', () => {
    const ctx = defineMsw([]).use(defineCapturedRequests()).make()

    expect(ctx.worker).toBeDefined()
    expect(Array.isArray(ctx.capturedRequests)).toBe(true)
  })
})
