---
title: 埋点上报
---

# 埋点上报

`defineTracker` 提供基于 `localStorage` 持久化与 `beaconTransport` 的可组合埋点队列。以核心实例为起点，按需叠加批量聚合、离线恢复、页面退出冲刷和页面错误采集插件。

## 插件如何组合

`defineTracker` 返回 `@greypan/js-kit` 的插件构建器。通过 `.use()` 逐层叠加插件，最后调用 `.make()` 生成实例。

每个插件只声明自己依赖的能力切片（`track`、`flush`、`pause`、`resume`、`stop`），因此**注册顺序有明确要求**：

1. 以 `defineTracker(options)` 为起点，提供基础的 `track()`、`flush()`、`pause()`、`resume()` 与 `localStorage` 持久化。
2. 需要批量聚合时，紧接着注册 `defineBatchTrack()`。它会覆写 `track()` 与 `flush()`，让上游调用进入批量缓冲，且 `flush()` 会先冲刷批量定时器再冲刷核心队列。
3. 把 `defineOfflineRestore()`、`defineLastWords()`、`definePageErrors()` 注册在 `defineBatchTrack()` 之后。这样页面退出时 `defineLastWords()` 会先清空批量缓冲，而 `definePageErrors()` 捕获的异常也会进入批量通道。
4. 销毁实例时调用 `tracker.stop()`。所有注册了全局监听的插件都会把清理逻辑自动串联到 `stop()` 中，与注册顺序无关。

## 推荐完整组合

在测试或演示场景下，传入自定义 `transport` 即可把上报载荷拦截在内存中。同一个域名下存在多个 Tracker 时，为每个实例指定不同的 `persistenceKey`，避免共用同一个 `localStorage` 键（`tracker:queue:<persistenceKey>`）。

```ts demo=tracker-playground
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent: object[] = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

// 默认按 500ms 窗口批量聚合
tracker.track({ event: 'page_view', path: '/docs' })

// 传入 batchDelay <= 0 跳过聚合窗口，立即进入发送队列
tracker.track({ event: 'checkout_start' }, 0)

// 离线期间暂停发送，恢复在线后继续冲刷
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// 卸载时清理所有插件注册的 window / document 监听
tracker.stop()

console.log(sent.length)
```

```js
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

// 默认按 500ms 窗口批量聚合
tracker.track({ event: 'page_view', path: '/docs' })

// 传入 batchDelay <= 0 跳过聚合窗口，立即进入发送队列
tracker.track({ event: 'checkout_start' }, 0)

// 离线期间暂停发送，恢复在线后继续冲刷
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// 卸载时清理所有插件注册的 window / document 监听
tracker.stop()

console.log(sent.length)
```

## 按需组合与自定义传输

不需要一次性引入所有插件。如果只需要错误监控与自定义 `fetch` 通道，可以只组合 `defineTracker` 与 `definePageErrors`。

核心队列只有在 `transport` 返回的 Promise 成功后才会移出条目；如果抛错或 reject，条目会保留在队列中等待下次 `resume()` 或 `flush()` 重试。

```ts
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/events',
  persistenceKey: 'error-only',
  transform: data => ({ ...data, appVersion: '1.4.0' }),
  transport: async item => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  }
})
  .use(
    definePageErrors({
      maxErrors: 20,
      dedupeWindowMs: 5_000,
      metadata: () => ({ route: location.pathname })
    })
  )
  .make()

tracker.track({ event: 'boot' })
tracker.stop()
```

```js
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/events',
  persistenceKey: 'error-only',
  transform: data => ({ ...data, appVersion: '1.4.0' }),
  transport: async item => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  }
})
  .use(
    definePageErrors({
      maxErrors: 20,
      dedupeWindowMs: 5_000,
      metadata: () => ({ route: location.pathname })
    })
  )
  .make()

tracker.track({ event: 'boot' })
tracker.stop()
```

## 插件详解

### 核心创建器：defineTracker

核心队列插件。默认把待发送数据持久化到 `localStorage`（键名为 `tracker:queue:<persistenceKey>`），并通过 `beaconTransport` 发送。

- **默认传输（`beaconTransport`）。** 优先调用 `navigator.sendBeacon(url, JSON.stringify(data))`；浏览器拒绝排队时降级为 `fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors', body })`。两条通道均以 `text/plain` 发送 JSON 字符串，避免跨域预检。
- **`transform` 必须幂等。** `defineBatchTrack` 估算体积时会调用一次 `transform`，实际发送前还会再调用一次。不要在 `transform` 中修改原对象，也不要生成随调用变化的随机值。
- **受限存储降级。** 当 `localStorage` 抛出 `SecurityError` 或配额错误时，Tracker 会降级为内存模式继续工作，不会让 `track()` 抛错。

| 参数                 | 类型                                      | 默认值            | 说明                                                   |
| -------------------- | ----------------------------------------- | ----------------- | ------------------------------------------------------ |
| `url`                | `string`                                  | 必填              | `beaconTransport` 默认使用的上报地址                   |
| `transform`          | `(data: object) => object`                | 原样返回          | 发送与体积估算前执行的幂等载荷变换                     |
| `transport`          | `(item: object) => Promise<void> \| void` | `beaconTransport` | 自定义单条传输函数；reject 时保留条目等待重试          |
| `persistenceKey`     | `string`                                  | `options.url`     | 持久化键后缀，用于隔离同源下的多个 Tracker             |
| `disablePersistence` | `boolean`                                 | `false`           | 为 `true` 时关闭 `localStorage` 持久化，仅使用内存队列 |

### 批量聚合插件：defineBatchTrack

把多次 `track(data, batchDelay?)` 调用按时间窗口聚合为数组后统一发送。

- 即使窗口内只有一条数据，也会包装为单元素数组（`object[]`），保证后端接收结构一致。
- 当单批体积超过 `maxBatchKB` 时，递归二分拆分成多个批次。单条本身超出上限时无法继续拆分，按原样尽力发送。
- 单次调用传入 `batchDelay <= 0`（如 `tracker.track(data, 0)`）可绕过批量窗口直接发送。

| 参数                | 类型     | 默认值 | 说明                                                                  |
| ------------------- | -------- | ------ | --------------------------------------------------------------------- |
| `defaultBatchDelay` | `number` | `500`  | 默认批量等待窗口（毫秒）                                              |
| `maxBatchKB`        | `number` | `64`   | 单批体积目标上限（KB，对应 `sendBeacon` / `keepalive` 的 64 KB 限制） |

### 离线恢复插件：defineOfflineRestore

自动监听 `window` 的 `offline` 与 `online` 事件。初始化时若 `navigator.onLine` 为 `false` 或触发 `offline`，立即暂停队列；网络恢复触发 `online` 时自动调用 `resume()`。SSR 环境下自动空转。

### 页面退出冲刷插件：defineLastWords

监听 `beforeunload`、`pagehide` 以及 `document` 的 `visibilitychange`（切到 `hidden` 时），在每个隐藏周期内尽力执行一次 `flush()`。页面重新可见后重置标记，下次离开时会再次触发。

### 页面错误采集插件：definePageErrors

监听 `window` 的 `error` 与 `unhandledrejection` 事件，并复用当前组合后的 `ctx.track()` 上报。不采集静态资源加载失败、`console.error` 或已被框架捕获的错误。

| 参数               | 类型                       | 默认值      | 说明                                          |
| ------------------ | -------------------------- | ----------- | --------------------------------------------- |
| `maxErrors`        | `number`                   | `20`        | 单次页面生命周期内最多上报的错误条数          |
| `dedupeWindowMs`   | `number`                   | `5000`      | 相同错误签名的去重时间窗口（`<= 0` 关闭去重） |
| `maxMessageLength` | `number`                   | `1000`      | `error.message` 的最大截断长度                |
| `maxStackLength`   | `number`                   | `8000`      | `error.stack` 的最大截断长度                  |
| `metadata`         | `object \| (() => object)` | `undefined` | 每次上报附带的额外上下文；不会覆盖标准字段    |

上报的页面错误载荷结构如下：

```ts
type PageErrorPayload = {
  event: 'page_error'
  timestamp: number
  error: {
    category: 'uncaught' | 'unhandled_rejection'
    message: string
    filename?: string
    lineno?: number
    colno?: number
    stack?: string
  }
  metadata?: object
}
```
