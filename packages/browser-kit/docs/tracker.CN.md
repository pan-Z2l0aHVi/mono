---
title: 埋点上报
---

# 埋点上报

`defineTracker` 提供基于插件组合的埋点 outbox，默认使用 `localStorage` 持久化与 `navigator.sendBeacon()`（失败时自动降级为 `fetch(..., { keepalive: true })`）。你可以按需组合批量聚合、离线恢复、页面退出冲刷和页面错误采集插件。

## 插件组合与自定义传输

通过自定义 `transport` 可在测试或演示环境中拦截上报载荷，通过 `persistenceKey` 隔离同源下的多个 Tracker 实例；组件卸载时调用 `stop()` 清理全局监听。

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

tracker.track({ event: 'page_view', path: '/docs' })
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()
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

tracker.track({ event: 'page_view', path: '/docs' })
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()
tracker.stop()

console.log(sent.length)
```

## 插件一览

| 插件                         | 职责                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `defineTracker(options)`     | 核心 outbox、`localStorage` 持久化、默认 `beaconTransport`、`pause()` / `resume()` / `flush()` |
| `defineBatchTrack(options?)` | 在 `defaultBatchDelay` 内批量聚合，超出 `maxBatchKB` 时二分递归分片                            |
| `defineOfflineRestore()`     | 监听 `offline` / `online` 自动暂停与恢复                                                       |
| `defineLastWords()`          | 监听 `beforeunload` / `pagehide` / `visibilitychange` 尽力冲刷积压数据                         |
| `definePageErrors(options?)` | 捕获未捕获异常与未处理 Promise 拒绝，内置去重窗口与上报上限                                    |
