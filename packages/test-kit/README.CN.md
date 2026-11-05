# @greypan/test-kit

> Vitest 浏览器模式与 MSW 的测试辅助。

[English](./README.md) | 简体中文

## 内部使用

这是本 workspace 的私有测试基础设施，不发布。在 workspace 包中通过 `workspace:*` 协议添加依赖。

`msw` 是 peer dependency。

## 快速开始

```ts
import { createMswTestEnv } from '@greypan/test-kit'
import { afterAll, afterEach, beforeAll, expect, it } from 'vite-plus/test'

const env = createMswTestEnv()

beforeAll(env.start)
afterEach(() => {
  env.reset()
  env.clearCapturedRequests()
})
afterAll(env.stop)

it('上报一次请求', async () => {
  const completion = fetch('/api/track', { method: 'POST', body: JSON.stringify({ event: 'page_view' }) })
  await env.settle(completion)

  expect(env.capturedRequests).toHaveLength(1)
  expect(env.capturedRequests[0].url).toBe('/api/track')
})
```

传入代表整个操作完成的 Promise，例如 `fetch()` 的返回值或队列的 flush。`settle` 看不到你没有传给它的工作。使用 fake timers 时，超时跟随 fake clock 推进。

请求会自动被捕获。环境会安装一个兜底 handler，以 `{ ok: true }` 应答，因此不需要手写。通过 `createMswTestEnv({ handlers })` 传入的 handler 优先级更高。

## 直接组合插件

```ts
import { defineMsw, defineCapturedRequests } from '@greypan/test-kit'
import { http, HttpResponse } from 'msw'

const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({ name: 'Alice' })
  })
]

const capture = defineCapturedRequests()
const ctx = defineMsw(handlers).use(capture).make()

await ctx.startMsw()

console.log(ctx.capturedRequests)

ctx.clearCapturedRequests()
await ctx.stopMsw()
```

## API

### `createMswTestEnv(options?)`

创建带自动请求捕获的完整 MSW 测试环境。

| 参数       | 类型               | 默认值 | 说明                                    |
| ---------- | ------------------ | ------ | --------------------------------------- |
| `handlers` | `RequestHandler[]` | `[]`   | 业务 handler，注册在记录 handler 之前。 |

返回 `MswTestEnv`。

| 属性                    | 类型                                                                    | 说明                                                   |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| `worker`                | `SetupWorker`                                                           | MSW service worker 实例。                              |
| `start`                 | `() => Promise<unknown>`                                                | 启动 worker，配合 `beforeAll` 使用。                   |
| `stop`                  | `() => void`                                                            | 停止 worker，配合 `afterAll` 使用。                    |
| `reset`                 | `() => void`                                                            | 重置 handler，配合 `afterEach` 使用。                  |
| `capturedRequests`      | `CapturedRequest[]`                                                     | 内置记录器捕获的请求，`url` 为请求 URL 的 pathname。   |
| `clearCapturedRequests` | `() => void`                                                            | 清空已捕获的请求。                                     |
| `settle`                | `(completion: PromiseLike<unknown>, timeout?: number) => Promise<void>` | 等待完成信号，失败或超时则 reject。默认超时 300 毫秒。 |

### `defineMsw(handlers)`

创建 MSW 生命周期插件。

| 参数       | 类型               | 说明           |
| ---------- | ------------------ | -------------- |
| `handlers` | `RequestHandler[]` | MSW 请求处理器 |

返回 `MswContext`，包含 `worker`、`startMsw`、`stopMsw` 和 `resetMsw`。

### `defineCapturedRequests()`

创建请求捕获插件。

返回 `CapturedRequestsContext`，包含 `capturedRequests` 和 `clearCapturedRequests`。

### `CapturedRequest`

| 属性        | 类型      | 说明              |
| ----------- | --------- | ----------------- |
| `url`       | `string`  | 请求 URL pathname |
| `body`      | `unknown` | 请求体            |
| `method`    | `string`  | HTTP 方法         |
| `timestamp` | `number`  | 捕获时间戳        |
