# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> 面向浏览器的工具库，提供命名空间存储、可组合埋点上报、环境检测、DOM 指标、文件处理、剪贴板、事件简写与历史导航跟踪。

[English](./README.md) | 简体中文 | [在线演示](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

## 安装

```npm
npm install @greypan/browser-kit
```

```pnpm
pnpm add @greypan/browser-kit
```

```bun
bun add @greypan/browser-kit
```

```yarn
yarn add @greypan/browser-kit
```

## 快速开始

### 带命名空间与 TTL 的存储

`defineLocal(namespace?)` 和 `defineSession(namespace?)` 按命名空间返回缓存单例。写入的值会附带过期时间，过期键在下次读取时自动删除并返回默认值。

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get<{ name: string }>('user') // { name: 'Alice' }

// 一小时后过期（单位 ms）
storage.set('token', 'abc123', 3_600_000)

// 监听同源其他标签页的变更
const unwatch = storage.watch<{ name: string }>('user', (next, prev) => {
  console.log('其他标签页更新了 user', next, prev)
})
unwatch()
```

### 组合式埋点上报

从 `defineTracker` 出发，用 `.use()` 按需叠加插件。把 `defineBatchTrack()` 放在 `defineLastWords()` 和 `definePageErrors()` 之前，这样页面退出时会先冲刷批量缓冲，捕获的页面错误也会进入批量上报通道。

```ts
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'main-app'
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 20, dedupeWindowMs: 5_000 }))
  .make()

tracker.track({ event: 'page_view', path: '/' })

// 实例销毁时移除全局监听
tracker.stop()
```

## 使用细节

- **SSR 安全降级。** 所有模块在访问浏览器 API 前都会检查 `window` 和 `document`。在无 DOM 环境下，`env.isSsr` 为 `true`，DOM 读取函数返回 `0`，`defineHistoryNav()` 返回空操作实例，存储读写静默降级不抛错。
- **受限存储降级。** 在隐私模式或受限 iframe 中访问 `localStorage` 抛出 `SecurityError` 时，`storage.set()` 返回 `false`，`storage.get()` 返回默认值。`defineTracker` 也会自动降级为内存队列，不会打断业务调用。
- **`storage.watch()` 仅触发于跨标签页。** 浏览器原生 `storage` 事件只在同源的其他标签页触发，不会在当前调用 `set()` 的标签页触发。同标签页通信请改用 `BroadcastChannel` 或应用状态。
- **Tracker 传输与跨域。** 默认的 `beaconTransport` 优先使用 `navigator.sendBeacon()`，被浏览器拒收时降级到 `fetch(..., { method: 'POST', keepalive: true, mode: 'no-cors' })`。两条通道都以 `text/plain` 发送 JSON 字符串，避免跨域预检请求。
- **同源多 Tracker 隔离。** 同一个页面创建多个 Tracker 时，为每个实例传入不同的 `persistenceKey`，避免它们共用同一个 `localStorage` 队列键（`tracker:queue:<persistenceKey>`）。
- **历史导航跟踪。** `defineHistoryNav()` 是幂等单例，在旁路记录 `canGoBack`、`canGoForward`、`currentEntry` 和 `entries()`，不会往 `history.state` 写入额外字段。调用 `dispose()` 可还原原生 `history.pushState` 与 `history.replaceState`。

## 模块索引

| 模块          | 导出内容                                                                                                              | 文档                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `storage`     | `defineLocal`、`defineSession`、`local`、`session`                                                                    | [`docs/storage.CN.md`](./docs/storage.CN.md)         |
| `tracker`     | `defineTracker`、`defineBatchTrack`、`defineOfflineRestore`、`defineLastWords`、`definePageErrors`、`beaconTransport` | [`docs/tracker.CN.md`](./docs/tracker.CN.md)         |
| `env`         | `env`                                                                                                                 | [`docs/env.CN.md`](./docs/env.CN.md)                 |
| `dom`         | `getViewportSize`、`getRootScrollTop`、`getRootScrollLeft`                                                            | [`docs/dom.CN.md`](./docs/dom.CN.md)                 |
| `file`        | `downloadFile`、`getImageInfo`、`isValidBase64`、`base64ToFile`、`fileToBase64`、`isSameFileType`                     | [`docs/file.CN.md`](./docs/file.CN.md)               |
| `copy`        | `copyToClipboard`                                                                                                     | [`docs/copy.CN.md`](./docs/copy.CN.md)               |
| `history-nav` | `defineHistoryNav`                                                                                                    | [`docs/history-nav.CN.md`](./docs/history-nav.CN.md) |
| `shortcut`    | `on`、`off`                                                                                                           | [`docs/shortcut.CN.md`](./docs/shortcut.CN.md)       |

> `definePlugin`、`parseUrl`、`formatFileSize`、`debounce` 等跨运行时纯 JS 工具位于 [`@greypan/js-kit`](../js-kit/README.CN.md)。

## License

MIT
