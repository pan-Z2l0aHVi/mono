import { defineCapturedRequests, defineMsw, type CapturedRequest } from '@greypan/test-kit'
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll } from 'vite-plus/test'

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

beforeAll(() => startMsw())
afterEach(() => {
  resetMsw()
  clearCapturedRequests()
})
afterAll(() => stopMsw())

export { capturedRequests, clearCapturedRequests, worker }
