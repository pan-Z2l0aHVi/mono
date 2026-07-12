# Tracker

数据埋点上报，支持批量聚合、离线恢复和临终遗言

[English](./README.md) | 简体中文

## 概述

基于插件架构的可组合埋点系统。特性：

- **批量聚合**：收集事件并批量发送，减少网络请求
- **Beacon 分片**：超过 64KB（sendBeacon 限制）时自动分片传输
- **离线恢复**：断网时将待发数据存入 IndexedDB，重连后自动恢复
- **临终遗言**：页面关闭或切到后台时立即发送待发数据
- **自动降级**：sendBeacon 失败时降级为 fetch keepalive

## 插件

### `defineTracker(options)`

核心埋点插件。通过 `sendBeacon` 发送数据，`fetch` 降级兜底。

| 参数                 | 类型      | 默认值 | 说明                                |
| -------------------- | --------- | ------ | ----------------------------------- |
| `options.endpoint`   | `string`  | -      | 埋点接口 URL                        |
| `options.sendBeacon` | `boolean` | `true` | 使用 sendBeacon（false = 仅 fetch） |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
const ctx = tracker.make()

ctx.send({ event: 'page_view', path: '/' })
```

### `defineBatchTrack(options?)`

批量聚合插件。收集事件并在延迟后批量发送。

| 参数                 | 类型     | 默认值 | 说明                       |
| -------------------- | -------- | ------ | -------------------------- |
| `options.batchDelay` | `number` | `3000` | 刷新批量的延迟时间（毫秒） |

```ts
import { defineTracker, defineBatchTrack } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack({ batchDelay: 5000 }))
  .make()

// 事件被批量收集，每 5 秒发送一次
tracker.send({ event: 'click', target: 'button' })
tracker.send({ event: 'scroll', position: 100 })
```

### `defineLastWords()`

临终遗言插件。在 `beforeunload` 和 `visibilitychange` 时立即刷新待发数据。

```ts
import { defineTracker, defineLastWords } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' }).use(defineLastWords()).make()
```

### `defineOfflineRestore()`

离线恢复插件。断网时将数据存入 IndexedDB，重连后自动恢复。

```ts
import { defineTracker, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' }).use(defineOfflineRestore()).make()
```

## 完整组合

组合所有插件实现完整的埋点方案：

```ts
import { defineTracker, defineBatchTrack, defineLastWords, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack())
  .use(defineLastWords())
  .use(defineOfflineRestore())
  .make()

// 在应用中使用
tracker.send({ event: 'page_view', path: '/' })
tracker.send({ event: 'click', target: 'signup' })
```

## 工作原理

1. **send** → 数据加入批量队列
2. **batchDelay** → 延迟后刷新批量
3. **beacon 分片** → 数据 > 64KB 时通过二分递归分片
4. **sendBeacon** → 主要传输方式：`navigator.sendBeacon`
5. **fetch 降级** → sendBeacon 失败时降级为 `fetch` + `keepalive: true`
6. **离线** → 网络不可用时数据存入 IndexedDB
7. **重连** → 从 IndexedDB 恢复待发数据并重发
8. **临终遗言** → 页面关闭时同步刷新待发数据
