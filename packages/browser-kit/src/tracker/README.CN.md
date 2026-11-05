# Tracker

> 发送埋点事件，支持批量发送、重试、离线处理与页面错误收集。

[English](./README.md) | 简体中文

## 概述

Tracker 把一个事件发送到一个接口。待发送事件默认保存在 localStorage 中，并在下次创建 Tracker 时恢复。没有安装批量插件时，事件按入队顺序逐条发送。

可以按需组合这些插件：

- 发送前聚合事件。
- 浏览器离线时暂停。
- 上报未捕获异常与未处理的 Promise rejection。
- 页面隐藏或即将关闭时发送待处理事件。

核心传输优先使用 `navigator.sendBeacon()`，失败时降级到带 `keepalive: true` 的 `fetch()`。`sendBeacon()` 返回 `true` 只表示浏览器接受了数据，不表示服务端已经收到。

## 核心

### `defineTracker(options)`

| 参数                 | 类型                                      | 默认值   | 说明                                                          |
| -------------------- | ----------------------------------------- | -------- | ------------------------------------------------------------- |
| `url`                | `string`                                  | -        | 埋点接口 URL。                                                |
| `transform`          | `(data: object) => object`                | 恒等函数 | 在序列化和计算大小前转换每条事件。                            |
| `transport`          | `(item: object) => Promise<void> \| void` | Beacon   | 替换单条事件的发送方式。返回的 Promise resolve 后才移除事件。 |
| `disablePersistence` | `boolean`                                 | `false`  | 不读写 localStorage 快照。                                    |
| `persistenceKey`     | `string`                                  | `url` 值 | 稳定的 localStorage 键。多个独立 Tracker 必须使用不同的键。   |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/track',
  transform: data => ({ ...data, source: 'web' })
}).make()

tracker.track({ event: 'page_view', path: '/' })
```

实例提供以下方法。

| 方法          | 说明                                                              |
| ------------- | ----------------------------------------------------------------- |
| `track(data)` | 加入一条事件并开始发送，除非 Tracker 已暂停或因持久化失败被阻塞。 |
| `pause()`     | 停止发送。新事件仍保留在待发送快照中。                            |
| `resume()`    | 解除暂停或失败阻塞，并重试保留的事件。                            |
| `flush()`     | 发送尚未在途的事件。它忽略暂停和单条失败，但不会清除暂停状态。    |

事件会一直保存在 localStorage 中，直到浏览器接受它们。`sendBeacon()` 和降级请求都失败时，事件继续保留。`flush()` 会重试调用时快照中的待处理和失败事件，不会重新启动已经在途的事件。

其他重试发生在三种时机：调用 `resume()`、安装 `defineOfflineRestore()` 后浏览器触发 `online`，或下次启动 Tracker 实例。

`persistenceKey` 默认使用 `url`。同一页面中的两个独立 Tracker 必须使用不同且稳定的键。localStorage 受限、已满或不可用时，Tracker 会提示一次，停止持久化并继续在内存中运行。旧快照可能导致下次启动时重复发送事件。

Tracker 包含监听器插件时，`stop()` 会释放监听器。它不会暂停、清空或发送待处理事件。不再需要实例时调用它。

## 插件

### `defineBatchTrack(options?)`

收集事件，并在延迟后以数组发送。

| 参数                | 类型     | 默认值 | 说明                                  |
| ------------------- | -------- | ------ | ------------------------------------- |
| `defaultBatchDelay` | `number` | `500`  | 默认批量延迟，单位为毫秒。            |
| `maxBatchKB`        | `number` | `64`   | 递归拆分前的最大批次大小，单位为 KB。 |

组合后的 `track(data, batchDelay?)` 支持每次调用指定延迟。传 `0` 或负数时该事件不参与批量聚合。大于 `maxBatchKB` 的批次会被拆分。单条超大事件仍作为一个整体发送，以保持数据结构不变。

```ts
import { defineBatchTrack, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack({ defaultBatchDelay: 1_000 }))
  .make()

tracker.track({ event: 'click', target: 'button' })
tracker.track({ event: 'scroll', position: 100 }, 0)
```

### `defineOfflineRestore()`

浏览器离线时暂停，包括 Tracker 启动时已经离线的情况，并在 `online` 事件后恢复。它不改变持久化行为，持久化由核心 Tracker 的 `disablePersistence` 控制。

### `definePageErrors(options?)`

收集未捕获异常和未处理的 Promise rejection，并通过组合后的 `track()` 发送。它不收集资源加载失败、console 消息或框架回调错误。

| 参数               | 类型                       | 默认值      | 说明                                        |
| ------------------ | -------------------------- | ----------- | ------------------------------------------- |
| `maxErrors`        | `number`                   | `20`        | 单个插件实例最多上报的事件数。              |
| `dedupeWindowMs`   | `number`                   | `5000`      | 错误签名去重窗口。为 `0` 或负数时关闭去重。 |
| `maxMessageLength` | `number`                   | `1000`      | 上报 message 的最大长度。                   |
| `maxStackLength`   | `number`                   | `8000`      | 上报 stack 的最大长度。                     |
| `metadata`         | `object \| (() => object)` | `undefined` | 每次上报的上下文，不能覆盖标准事件字段。    |

事件结构如下。

```ts
{
  event: 'page_error',
  timestamp: 1760000000000,
  error: {
    category: 'uncaught', // 或 'unhandled_rejection'
    message: 'boom',
    filename: '/assets/app.js',
    lineno: 12,
    colno: 34,
    stack: 'Error: boom\n    at ...'
  },
  metadata: { app: 'demo' }
}
```

message 和 stack 默认会截断，但不会自动脱敏个人信息。metadata 回调抛错或返回非对象时，只省略 metadata，错误仍会上报。

`make()` 安装监听器。`stop()` 移除监听器，且不能重新开始收集。不要在同一页面重复安装这个插件，因为每次安装都会增加独立监听器和计数。

```ts
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(definePageErrors({ metadata: { app: 'demo' } }))
  .make()

tracker.stop()
```

### `defineLastWords()`

在 `beforeunload`、`pagehide` 以及 `visibilitychange` 让文档隐藏时调用组合后的 `flush()`。flush 返回 Promise，但页面退出路径只尽力发送。它不等待服务端响应，持久化失败也不会阻止页面关闭。

## 推荐组合

```ts
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack())
  .use(defineOfflineRestore())
  .use(definePageErrors())
  .use(defineLastWords())
  .make()

tracker.track({ event: 'page_view', path: '/' })
tracker.track({ event: 'click', target: 'signup' })
```
