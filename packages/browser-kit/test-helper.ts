import { createMswTestEnv } from '@greypan/test-kit'
import { afterAll, afterEach, beforeAll } from 'vite-plus/test'

interface SharedMswEnv {
  env: ReturnType<typeof createMswTestEnv>
  hooksRegistered: boolean
}

const sharedKey = Symbol.for('@greypan/browser-kit/shared-msw-env')

/*
 * setupFiles 由 Vitest 以带 `?import&browserv` 的 URL 载入，与 spec 里 `../../../test-helper`
 * 解析出的模块是两个实例；同一个 spec 文件因此会执行两遍本模块。MSW 3 的 WebSocket 拦截器
 * 禁止两个 worker 同时生效（第二个 start 会抛 "already replaced"），而两份 worker 还会
 * 各注册一套捕获 handler。所以 env 与 hook 注册都挂到 globalThis，只保留一份。
 */
const shared = ((globalThis as typeof globalThis & { [sharedKey]?: SharedMswEnv })[sharedKey] ??= {
  env: createMswTestEnv(),
  hooksRegistered: false
})

if (!shared.hooksRegistered) {
  shared.hooksRegistered = true
  beforeAll(() => shared.env.start())
  afterEach(() => {
    shared.env.reset()
    shared.env.clearCapturedRequests()
  })
  afterAll(() => shared.env.stop())
}

export const capturedRequests = shared.env.capturedRequests
export const clearCapturedRequests = shared.env.clearCapturedRequests
export const worker = shared.env.worker

/**
 * 等待在途 MSW 请求全部落地。tracker 的 send 是 fire-and-forget，上一用例
 * 发出的请求可能在共享 afterEach 清空后才落地并 push，从而污染下一个用例
 * （典型：离线用例断言 toHaveLength(0) 时收到上一条残留请求）。
 * 在用例 beforeEach 中调用本函数，等残留请求落地后再进入新用例。
 * 兼容 fake timers：调用前后保持原有计时器状态。
 */
export async function settleCapturedRequests(timeout = 300) {
  await shared.env.settle(timeout)
}
