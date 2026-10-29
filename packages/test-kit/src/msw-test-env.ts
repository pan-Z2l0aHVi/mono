import { http, HttpResponse, type RequestHandler } from 'msw'
import { setupWorker, type SetupWorker } from 'msw/browser'

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
  settle: (completion: PromiseLike<unknown>, timeout?: number) => Promise<void>
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

/** 等待调用方提供的完成信号；超时不会伪装成请求已结束。 */
function settleCompletion(completion: PromiseLike<unknown>, timeout = 300): Promise<void> {
  if (!completion || typeof completion.then !== 'function') {
    return Promise.reject(new TypeError('MSW operation requires a completion promise'))
  }
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`MSW operation did not finish within ${timeout}ms`)), timeout)
    Promise.resolve(completion).then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      error => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })
}

/**
 * 一站式 MSW 测试环境：自动捕获所有拦截到的请求（`url` 为 pathname），无需
 * 消费者手写 catch-all handler；`settle` 等待调用方的完成信号；`start`/`stop`/`reset`
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
    settle: (completion, timeout) => settleCompletion(completion, timeout)
  }
}
