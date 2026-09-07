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

/**
 * 等待在途 MSW 请求全部落地。tracker 的 send 是 fire-and-forget，上一用例
 * 发出的请求可能在共享 afterEach 清空后才落地并 push，从而污染下一个用例
 * （典型：离线用例断言 toHaveLength(0) 时收到上一条残留请求）。
 * 在用例 beforeEach 中调用本函数，等残留请求落地后再进入新用例。
 * 兼容 fake timers：调用前后保持原有计时器状态。
 */
export async function settleCapturedRequests(timeout = 300) {
  await env.settle(timeout)
}
