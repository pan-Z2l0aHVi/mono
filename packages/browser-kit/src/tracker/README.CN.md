# Tracker

数据埋点上报，支持批量聚合、离线恢复和临终遗言。

[English](./README.md) | 简体中文

## 概述

Tracker 是一个基于插件架构的可组合埋点系统。它维护一个待传输 outbox，用来保存尚未被浏览器传输层接受的数据。

- **待传输 outbox**：默认持久化到 localStorage，并会在下次创建 Tracker 时恢复。
- **有序常规 drain**：普通 `track()` 按入队顺序逐条发送。
- **批量聚合**：收集事件，并在可配置的延迟后以数组形式发送。
- **Beacon 分片**：超过配置的 `maxBeaconSize` 时递归分片，默认阈值为 64 KB。
- **离线恢复**：离线时暂停，浏览器重新联网后继续处理保留的事件。
- **临终遗言**：页面离开或隐藏时 best-effort 刷新待发数据。
- **自动降级**：必要时从 `sendBeacon()` 降级到带 `keepalive: true` 的 `fetch()`。

## 核心插件

### `defineTracker(options)`

| 配置                 | 类型                       | 默认值     | 说明                                                              |
| -------------------- | -------------------------- | ---------- | ----------------------------------------------------------------- |
| `url`                | `string`                   | -          | 埋点接口 URL                                                      |
| `transform`          | `(data: object) => object` | 恒等函数   | 在序列化和计算字节大小前转换每条事件                              |
| `disablePersistence` | `boolean`                  | `false`    | 禁止读取和写入 localStorage 待传输 outbox                         |
| `persistenceKey`     | `string`                   | `url` 的值 | localStorage outbox 的稳定键；多个独立 Tracker 必须使用不同的 key |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/track',
  transform: data => ({ ...data, source: 'web' })
}).make()

tracker.track({ event: 'page_view', path: '/' })
```

创建后的上下文提供以下方法：

| 方法          | 说明                                                                                     |
| ------------- | ---------------------------------------------------------------------------------------- |
| `track(data)` | 将一条事件加入队列；若 Tracker 未暂停且未被失败传输阻塞，则启动常规 drain。              |
| `pause()`     | 停止常规 drain；后续上报数据仍会保留在待传输 outbox 中。                                 |
| `resume()`    | 解除暂停/失败 gate，并调度重试保留条目。                                                 |
| `flush()`     | 以 best-effort 方式发送所有尚未在途的条目；它会忽略暂停和失败 gate，但不会改变暂停状态。 |

核心插件会先序列化转换后的事件，再尝试 `navigator.sendBeacon()`。若浏览器返回 `false` 或调用抛出异常，便降级为带 `keepalive: true` 的 `fetch()`。`sendBeacon()` 返回 `true` 只代表浏览器已接受数据并安排传输，不代表服务端已经收到数据。

条目会持续保存在 localStorage，直到浏览器传输层接受它们。若 Beacon 路径和 `fetch()` 降级请求都失败，条目会继续保留；`flush()` 也会重试调用时快照中的 pending 和 failed 条目，但不会重新启动已经在途的条目。除此之外，自动重试只会在调用 `resume()`、安装 `defineOfflineRestore()` 后触发 `online` 事件，或下次创建 Tracker 实例时发生。这是浏览器传输层 outbox，而不是等待服务端确认的投递队列。

`persistenceKey` 默认使用 `url`。同一页面中多个相互独立的 Tracker 如果复用同一个 key，会读取和覆盖同一份快照；应为每个独立实例提供不同且稳定的 key。localStorage 受限、配额耗尽或读写失败时，Tracker 会只告警一次，停止后续持久化并继续以内存模式发送；旧快照可能残留，因此下次初始化可能出现 at-least-once 重复发送。这个 fallback 不提供 exactly-once 保证。

## 插件

### `defineBatchTrack(options?)`

收集事件，并在延迟后以数组形式发送。

| 配置                | 类型     | 默认值 | 说明                                    |
| ------------------- | -------- | ------ | --------------------------------------- |
| `defaultBatchDelay` | `number` | `500`  | 默认批量延迟，单位为毫秒                |
| `maxBeaconSize`     | `number` | `64`   | 触发递归分片前的最大批次大小，单位为 KB |

组合后的 `track(data, batchDelay?)` 支持逐次指定延迟。传入 `0` 或负数可跳过该事件的批量聚合。批次大于 `maxBeaconSize` 时会递归分片；单条超大事件仍会作为一个条目发送，以保持其数据结构。

```ts
import { defineBatchTrack, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack({ defaultBatchDelay: 1_000 }))
  .make()

tracker.track({ event: 'click', target: 'button' })
tracker.track({ event: 'scroll', position: 100 }, 0)
```

### `defineOfflineRestore()`

浏览器离线时暂停 Tracker（包括初始化时已离线），并在收到 `online` 事件后调用 `resume()`。它不改变持久化策略：持久化属于核心 Tracker，可通过 `disablePersistence` 关闭。

### `defineLastWords()`

在 `beforeunload`、`pagehide` 和文档因 `visibilitychange` 进入隐藏状态时调用组合后的 `flush()`。刷新返回 Promise，但退出路径只做异步 best-effort 尝试；不会等待服务端确认，持久化失败也不会阻塞页面退出。

## 推荐组合

```ts
import { defineBatchTrack, defineLastWords, defineOfflineRestore, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack())
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .make()

tracker.track({ event: 'page_view', path: '/' })
tracker.track({ event: 'click', target: 'signup' })
```
