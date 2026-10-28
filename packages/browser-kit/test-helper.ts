import { createMswTestEnv } from '@greypan/test-kit'
import { afterAll, afterEach, beforeAll } from 'vite-plus/test'

/**
 * browser-kit 测试共享的 MSW 环境：捕获 handler 记录所有未命中用例内
 * handler 的请求（`url` 为 pathname）并以 `{ ok: true }` 应答。
 */
const env = createMswTestEnv()

beforeAll(() => env.start())
afterEach(() => {
  env.reset()
  env.clearCapturedRequests()
})
afterAll(() => env.stop())

export const capturedRequests = env.capturedRequests
export const clearCapturedRequests = env.clearCapturedRequests
export const worker = env.worker
