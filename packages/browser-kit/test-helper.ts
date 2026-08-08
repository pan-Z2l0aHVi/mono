import { defineCapturedRequests, defineMsw } from '@greypan/test-kit'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, vi } from 'vite-plus/test'

const { capturedRequests, clearCapturedRequests } = defineCapturedRequests().make()

/** 默认 handlers：拦截所有 POST 请求 */
const handlers = [
  http.post('*', async ({ request }) => {
    const body = await request.json()
    capturedRequests.push({
      url: new URL(request.url).pathname,
      body,
      method: 'POST',
      timestamp: Date.now()
    })
    return HttpResponse.json({ ok: true })
  })
]

const { worker, startMsw, stopMsw, resetMsw } = defineMsw(handlers).make()

/**
 * 等待在途 MSW 请求全部落地。tracker 的 send 是 fire-and-forget，上一用例
 * 发出的 fetch 可能在共享 afterEach 清空后才落地并 push，从而污染下一个
 * 用例的断言（典型：离线用例断言 toHaveLength(0) 时收到上一条残留 POST）。
 * 在用例 beforeEach 中调用本函数，等残留请求落地后再进入新用例。
 * 兼容 fake timers：调用前后保持原有计时器状态。
 */
export async function settleCapturedRequests(timeout = 300) {
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

beforeAll(() => startMsw())
afterEach(() => {
  resetMsw()
  clearCapturedRequests()
})
afterAll(() => stopMsw())

export { capturedRequests, clearCapturedRequests, worker }
