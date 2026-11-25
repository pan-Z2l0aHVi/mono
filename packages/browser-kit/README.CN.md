# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> 零框架依赖的浏览器工具库，提供命名空间存储、可组合埋点上报、环境检测、DOM 指标、文件处理、剪贴板、DOM 事件封装与同文档历史导航跟踪。

[English](./README.md) | 简体中文 | [在线演示](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

- **适用运行时**：现代浏览器（`Chrome >= 111`、`Edge >= 111`、`Safari / iOS >= 16.4`、`Firefox >= 128`）。
- **零框架依赖**：不绑定 React、Vue 或 Angular 运行时。
- **ESM-only 与 Tree-shakable**：纯 ES 模块发布，声明 `"sideEffects": false`，支持按子路径导入（`@greypan/browser-kit/<module>`）。
- **完整 TypeScript 类型**：根入口与所有子路径均附带 `.d.ts` 类型声明。

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

可从 `@greypan/browser-kit` 统一导入，或按子路径（如 `@greypan/browser-kit/storage`）直接引入单个模块。

## 快速开始

### 带命名空间与 TTL 的存储

`defineLocal(namespace?)` 和 `defineSession(namespace?)` 按命名空间返回缓存单例。写入的值会附带元信息，过期键在下次读取时自动删除并返回默认值。

```ts
import { defineLocal } from '@greypan/browser-kit/storage'

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

### 可组合埋点上报

从 `defineTracker()` 出发，用 `.use()` 按需叠加插件。把 `defineBatchTrack()` 放在 `defineLastWords()` 和 `definePageErrors()` 之前，确保页面退出时会先冲刷批量缓冲，捕获的页面错误也会经过批量通道。

```ts
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit/tracker'

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

// 实例销毁时移除全局监听（不会清空 outbox）
tracker.stop()
```

### 剪贴板与历史导航

```ts
import { copyToClipboard } from '@greypan/browser-kit/copy'
import { defineHistoryNav } from '@greypan/browser-kit/history-nav'

await copyToClipboard('https://example.com/share')
await copyToClipboard(new Blob(['<b>Copied</b>'], { type: 'text/html' }))

const nav = defineHistoryNav({ namespace: 'my-app' })
const stop = nav.onCurrentEntryChange(({ from, navigationType }) => {
  console.log(navigationType, from?.url, '->', nav.currentEntry?.url)
})

if (nav.canGoBack) {
  history.back()
}

stop()
```

## 模块总览

| 子路径                             | 核心导出                                                                                           | 适用场景                                                                                | 文档                                                 |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `@greypan/browser-kit/storage`     | `defineLocal`、`defineSession`、`local`、`session`                                                 | 带命名空间、TTL 过期、配额清理与跨标签页 `watch()` 的 `localStorage` / `sessionStorage` | [`docs/storage.CN.md`](./docs/storage.CN.md)         |
| `@greypan/browser-kit/tracker`     | `defineTracker`、`defineBatchTrack`、`defineOfflineRestore`、`defineLastWords`、`definePageErrors` | 可组合埋点队列：批量聚合、64 KB 分片、离线恢复、页面退出冲刷与页面错误收集              | [`docs/tracker.CN.md`](./docs/tracker.CN.md)         |
| `@greypan/browser-kit/env`         | `env`                                                                                              | 惰性 UA 与特性检测：系统、浏览器、WebView、微信/支付宝/钉钉、iframe、PWA 与 SSR         | [`docs/env.CN.md`](./docs/env.CN.md)                 |
| `@greypan/browser-kit/dom`         | `getViewportSize`、`getRootScrollTop`、`getRootScrollLeft`                                         | 读取视口尺寸与根滚动偏移，带 SSR 降级                                                   | [`docs/dom.CN.md`](./docs/dom.CN.md)                 |
| `@greypan/browser-kit/file`        | `downloadFile`、`getImageInfo`、`isValidBase64`、`base64ToFile`、`fileToBase64`、`isSameFileType`  | 流式文件下载（含进度回调）、图片宽高读取、Base64 互转与文件头 Magic Number 类型校验     | [`docs/file.CN.md`](./docs/file.CN.md)               |
| `@greypan/browser-kit/copy`        | `copyToClipboard`                                                                                  | 字符串与 `Blob` 写入剪贴板，支持自定义 MIME 与降级链路                                  | [`docs/copy.CN.md`](./docs/copy.CN.md)               |
| `@greypan/browser-kit/history-nav` | `defineHistoryNav`                                                                                 | 只读同文档导航栈跟踪（`canGoBack`、`canGoForward`、`entries()`）                        | [`docs/history-nav.CN.md`](./docs/history-nav.CN.md) |
| `@greypan/browser-kit/shortcut`    | `on`、`off`                                                                                        | 面向 `Window` 与 `Document` 的强类型 `addEventListener` / `removeEventListener` 简写    | [`docs/shortcut.CN.md`](./docs/shortcut.CN.md)       |

## 兼容性与使用边界

- **SSR 行为**：`dom` 工具函数返回 `0` / `{ width: 0, height: 0 }`，`defineHistoryNav()` 返回空操作实例，`env.isSsr` / `env.isBrowser` 正常识别运行环境，`storage` 读写静默降级不抛错，Tracker 生命周期插件（`defineLastWords`、`defineOfflineRestore`、`definePageErrors`）空转并保留 `stop()` 契约。其余纯浏览器操作（`file`、`copy`、`shortcut`、`storage.watch()` 以及依赖 `navigator` 的 `env` 属性如 `isIpadOs`、`isChrome`、`isSafari`）需在浏览器端调用。
- **受限存储与配额**：在隐私模式或沙箱 iframe 中访问 `localStorage` / `sessionStorage` 抛出 `SecurityError` 时，`storage.set()` 返回 `false`，`storage.get()` 返回默认值。遇到 `QuotaExceededError` 时，`storage.set()` 会通过 `clearUseless()` 清理当前命名空间内的过期键并重试一次。`defineTracker()` 在持久化失败时降级为内存队列（at-least-once 语义）。
- **`storage.watch()` 仅触发于跨标签页**：浏览器原生 `storage` 事件只在同源其他标签页触发，不会在当前调用 `set()` 的标签页触发。同标签页通知请改用 `BroadcastChannel` 或应用状态。
- **Tracker 传输与跨域**：内置默认传输优先调用 `navigator.sendBeacon()`，被拒收或异常时降级到 `fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors' })`。两条路径均以 `text/plain` 发送 JSON 字符串以避免跨域预检；如需替换，可在 `defineTracker()` 中传入自定义 `transport`。
- **同源多 Tracker 隔离**：同一页面存在多个 Tracker 实例时，请为每个实例传入不同的 `persistenceKey`，避免共用同一个 `localStorage` 队列键（`tracker:queue:<persistenceKey>`）。
- **剪贴板降级**：`copyToClipboard()` 内部委托给 `copy-to-clipboard`，安全上下文下优先使用 `navigator.clipboard`，否则回退到 `document.execCommand('copy')`。传入 `Blob` 时自动读取文本内容，并按 `options.format || blob.type || 'text/plain'` 确定 MIME 类型。
- **历史导航范围**：`defineHistoryNav()` 是幂等单例，在旁路栈中跟踪同文档导航（`pushState`、`replaceState`、`popstate`、`hashchange`），通过 `sessionStorage` 持久化（受限时降级为内存态），不会向 `history.state` 写入任何字段。整页跨文档跳转与 `'reload'` 类型检测不在其职责内。调用 `dispose()` 可还原原生 `history.pushState` 与 `history.replaceState`。

> `definePlugin`、`parseUrl`、`formatFileSize`、`debounce` 等跨运行时纯 JS 工具位于 [`@greypan/js-kit`](../js-kit/README.CN.md)。

## License

MIT
