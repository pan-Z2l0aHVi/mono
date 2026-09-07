# @greypan/test-kit

> Vitest 浏览器模式下的测试基础设施插件，基于 MSW

[English](./README.md) | 简体中文

## 功能

- **MSW 测试环境**：一次 `createMswTestEnv()` 接线 worker 生命周期、自动请求捕获和在途排空
- **MSW 生命周期**：通过插件组合管理 Mock Service Worker 的启动/停止/重置
- **请求捕获**：记录并断言拦截到的 HTTP 请求
- **插件组合**：基于 js-kit 插件系统的可组合测试基础设施

## 安装

```bash
# npm
npm install @greypan/test-kit

# pnpm
pnpm add @greypan/test-kit

# yarn
yarn add @greypan/test-kit

# bun
bun add @greypan/test-kit
```

> 需要 `msw` 作为 peer dependency。`settle` 还依赖 `vite-plus/test` 再导出的 Vitest API。

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
  doTracking({ event: 'page_view' }) // fire-and-forget POST

  await env.settle() // 等待在途请求全部落地

  expect(env.capturedRequests).toHaveLength(1)
  expect(env.capturedRequests[0].url).toBe('/api/track')
})
```

捕获是自动的：env 会安装自己的 catch-all 记录 handler（以 `{ ok: true }` 应答），无需手写。业务 handler 的应答优先于记录 handler；通过 `createMswTestEnv({ handlers })` 传入。

### 直接组合插件

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

// ... 运行测试 ...

console.log(ctx.capturedRequests) // [{ url: '/api/user', body: ..., method: 'GET', timestamp: ... }]

ctx.clearCapturedRequests()
await ctx.stopMsw()
```

## API

### `createMswTestEnv(options?)`

创建带有自动请求捕获的完整 MSW 测试环境。

| 参数       | 类型               | 默认值 | 说明                                                   |
| ---------- | ------------------ | ------ | ------------------------------------------------------ |
| `handlers` | `RequestHandler[]` | `[]`   | 业务 handlers，注册在内置记录 handler 之前，其应答优先 |

**返回：** `MswTestEnv`，包含：

| 属性                    | 类型                            | 说明                                                                          |
| ----------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| `worker`                | `SetupWorker`                   | MSW service worker 实例                                                       |
| `start`                 | `() => Promise<unknown>`        | 启动 service worker（`beforeAll(env.start)`）                                 |
| `stop`                  | `() => void`                    | 停止 service worker（`afterAll(env.stop)`）                                   |
| `reset`                 | `() => void`                    | 重置所有处理器为默认值（`afterEach`）                                         |
| `capturedRequests`      | `CapturedRequest[]`             | 内置记录 handler 捕获的请求；`url` 为请求 URL 的 pathname                     |
| `clearCapturedRequests` | `() => void`                    | 清空所有捕获的请求                                                            |
| `settle`                | `(timeout?: number) => Promise` | 排空在途请求（约 60ms 稳定窗口，默认 `timeout` 300ms）；保持 fake timers 状态 |

### `defineMsw(handlers)`

创建 MSW 生命周期插件。返回包含 worker 管理方法的插件。

| 参数       | 类型               | 默认值 | 说明           |
| ---------- | ------------------ | ------ | -------------- |
| `handlers` | `RequestHandler[]` | -      | MSW 请求处理器 |

**返回：** `MswContext`，包含：

| 属性       | 类型                  | 说明                    |
| ---------- | --------------------- | ----------------------- |
| `worker`   | `SetupWorker`         | MSW service worker 实例 |
| `startMsw` | `() => Promise<void>` | 启动 service worker     |
| `stopMsw`  | `() => void`          | 停止 service worker     |
| `resetMsw` | `() => void`          | 重置所有处理器为默认值  |

### `defineCapturedRequests()`

创建请求捕获插件。记录拦截到的 HTTP 请求。

**返回：** `CapturedRequestsContext`，包含：

| 属性                    | 类型                | 说明               |
| ----------------------- | ------------------- | ------------------ |
| `capturedRequests`      | `CapturedRequest[]` | 捕获的请求数组     |
| `clearCapturedRequests` | `() => void`        | 清空所有捕获的请求 |

### `CapturedRequest`

捕获请求的类型。

| 属性        | 类型      | 说明              |
| ----------- | --------- | ----------------- |
| `url`       | `string`  | 请求 URL pathname |
| `body`      | `unknown` | 请求体            |
| `method`    | `string`  | HTTP 方法         |
| `timestamp` | `number`  | 捕获时间戳        |
