import { http, HttpResponse, type RequestHandler } from 'msw'
import { setupWorker, type SetupWorker } from 'msw/browser'
import { vi } from 'vite-plus/test'

import { defineCapturedRequests, type CapturedRequest } from './captured-requests'
import { defineMsw } from './msw'

export interface MswTestEnvOptions {
  /** 业务 handlers。自动捕获 handler 固定注册在其后：业务 handler 应答的请求优先，不会落入捕获记录。 */
  handlers?: RequestHandler[]
}

export interface MswTestEnv {
  worker: SetupWorker
  start: () => Promise<unknown>
  stop: () => void
  reset: () => void
  capturedRequests: CapturedRequest[]
  clearCapturedRequests: () => void
  settle: (timeout?: number) => Promise<void>
}

/** 请求体可能是任意类型；JSON 解析失败时退回原始文本，无体请求返回 null。 */
async function readBody(request: Request): Promise<unknown> {
  const text = await request.text()
  if (text.length === 0) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function createRecordingHandler(capturedRequests: CapturedRequest[]): RequestHandler {
  return http.all('*', async ({ request }) => {
    capturedRequests.push({
      url: new URL(request.url).pathname,
      body: await readBody(request),
      method: request.method,
      timestamp: Date.now()
    })
    return HttpResponse.json({ ok: true })
  })
}

/**
 * 等待在途 MSW 请求全部落地。fire-and-forget 请求可能在用例清空后才落地并
 * push，从而污染下一个用例的断言（典型：离线用例断言 toHaveLength(0) 时收到
 * 上一条残留请求）。在用例 beforeEach 中调用，等残留请求落地后再进入新用例。
 * 兼容 fake timers：调用前后保持原有计时器状态。
 */
async function settleCapturedRequests(capturedRequests: readonly CapturedRequest[], timeout = 300): Promise<void> {
  const hadFakeTimers = vi.isFakeTimers()
  vi.useRealTimers()
  const start = Date.now()
  let last = capturedRequests.length
  let stableWindows = 0
  while (Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, 20))
    if (capturedRequests.length === last) {
      // 连续多个稳定窗口（约 60ms 无新增）才认为在途请求已排空；
      // 单一 20ms 窗口在 CI 负载下可能因 fetch 落地耗时 > 20ms 而误判。
      stableWindows += 1
      if (stableWindows >= 3) break
    } else {
      stableWindows = 0
      last = capturedRequests.length
    }
  }
  if (hadFakeTimers) vi.useFakeTimers()
}

/**
 * 一站式 MSW 测试环境：自动捕获所有拦截到的请求（`url` 为 pathname），无需
 * 消费者手写 catch-all handler；`settle` 排空在途请求；`start`/`stop`/`reset`
 * 包装 worker 生命周期，由消费者在 beforeAll/afterEach/afterAll 中各接一行。
 */
export function createMswTestEnv(options: MswTestEnvOptions = {}): MswTestEnv {
  const capture = defineCapturedRequests().make()
  const { capturedRequests, clearCapturedRequests } = capture

  // MSW 按注册顺序执行 handler 并在首个应答处停止：捕获 handler 必须在业务
  // handlers 之后注册，才能只接住业务 handlers 未命中的请求。
  const { worker, startMsw, stopMsw, resetMsw } = defineMsw([
    ...(options.handlers ?? []),
    createRecordingHandler(capturedRequests)
  ]).make()

  return {
    worker,
    start: () => startMsw(),
    stop: () => stopMsw(),
    reset: () => resetMsw(),
    capturedRequests,
    clearCapturedRequests,
    settle: (timeout?: number) => settleCapturedRequests(capturedRequests, timeout)
  }
}
