# @greypan/browser-kit

> 浏览器工具函数库，提供存储、埋点、环境检测等功能

[English](./README.md) | 简体中文

## 功能

- **Storage**：`defineLocal`/`defineSession` 支持命名空间、TTL 过期、跨标签页同步
- **Tracker**：数据埋点上报，支持批量聚合、离线恢复、临终遗言
- **Env**：17 个环境检测标志（微信、钉钉、PWA、移动端等）
- **DOM**：视口尺寸和滚动位置工具
- **File**：文件下载、base64 转换、图片信息、文件类型校验
- **Copy**：跨浏览器剪贴板 API，支持 Blob
- **Shortcut**：事件辅助（`on`/`off`）、异步辅助（`sleep`/`sleepSync`/`defer`）

## 安装

```bash
# npm
npm install @greypan/browser-kit

# pnpm
pnpm add @greypan/browser-kit

# yarn
yarn add @greypan/browser-kit

# bun
bun add @greypan/browser-kit
```

## 快速开始

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

// 基本用法
storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// TTL（1 小时）
storage.set('token', 'abc123', 3600_000)

// 监听跨标签页变更
const unwatch = storage.watch('user', (newVal, oldVal) => {
  console.log('user changed', newVal, oldVal)
})
```

## 插件

### `defineTracker(options)`

核心埋点插件。它会用 `JSON.stringify` 序列化数据，优先调用 `navigator.sendBeacon()`；浏览器未接受 Beacon 时，降级为带 `keepalive: true` 的 `fetch()`。

| 配置                 | 类型                       | 默认值     | 说明                                                              |
| -------------------- | -------------------------- | ---------- | ----------------------------------------------------------------- |
| `url`                | `string`                   | -          | 埋点接口 URL                                                      |
| `transform`          | `(data: object) => object` | 恒等函数   | 在序列化和计算批次大小前转换每一条事件                            |
| `disablePersistence` | `boolean`                  | `false`    | 禁止从 localStorage 读取和向其中写入待传输 outbox                 |
| `persistenceKey`     | `string`                   | `url` 的值 | localStorage outbox 的稳定键；多个独立 Tracker 必须使用不同的 key |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' }).make()
tracker.track({ event: 'page_view', path: '/' })
```

核心上下文提供 `track(data)`、`pause()`、`resume()` 和 `flush()`。`pause()` 会让后续事件继续保留在内存和持久化待传输 outbox 中；`resume()` 会重试仍保留的事件。`flush()` 返回 Promise，是 best-effort：它会绕过暂停和单条消费失败状态，发送调用时尚未在途的事件并等待传输 Promise settle；但不会解除暂停，也不会等待服务端确认。Tracker 的 storage 故障会只告警一次并降级为 memory-only，因此 `flush()` 不会因 localStorage 失败 reject；旧快照可能残留，并在下次初始化时造成 at-least-once 重复发送。

### `defineBatchTrack(options?)`

批量聚合插件。它收集事件，并在延迟后以数组形式发送。批次超过 `maxBeaconSize` 时会递归分片；单条超大事件仍会作为一个条目发送。

| 配置                | 类型     | 默认值 | 说明                                    |
| ------------------- | -------- | ------ | --------------------------------------- |
| `defaultBatchDelay` | `number` | `500`  | 默认批量刷新延迟，单位为毫秒            |
| `maxBeaconSize`     | `number` | `64`   | 触发递归分片前的最大批次大小，单位为 KB |

组合后的 `track(data, batchDelay?)` 支持逐次指定延迟；传入 `0` 或负数可跳过该事件的批量聚合。

### `defineOfflineRestore()`

离线恢复插件。浏览器离线时（包括初始化时已离线）暂停 Tracker，并在收到 `online` 事件后调用 `resume()`。

### `defineLastWords()`

临终遗言插件。在 `beforeunload`、`pagehide` 以及页面变为隐藏状态时调用 `flush()`，以 best-effort 方式尝试发送待发数据。

**推荐组合顺序：**

```ts
import { defineBatchTrack, defineLastWords, defineOfflineRestore, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack())
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .make()
```

待传输条目会保存在 localStorage，直到浏览器传输层接受它们。`sendBeacon()` 返回 `true` 只表示浏览器已经接受数据并安排传输，并不表示服务端已确认接收。若 `sendBeacon()` 与 `fetch()` 降级都失败，条目会继续保留。`flush()` 会重试调用时快照中的 `pending` 和 `failed` 条目，但不会重新启动已经处于 in-flight 的条目；其他自动重试路径仍是调用 `resume()`、安装 `defineOfflineRestore()` 后触发 `online` 事件，或下次初始化 Tracker。`flush()` 不会解除暂停状态。

`persistenceKey` 默认使用 `url`。同一页面中多个相互独立的 Tracker 如果复用同一个 key，会读取和覆盖同一份快照；应为每个独立实例提供不同且稳定的 key。localStorage 受限、配额耗尽或读写失败时，Tracker 会停止后续持久化并继续以内存模式发送；这是一种明确的 best-effort 降级，不提供 exactly-once 保证。

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

创建带命名空间的 localStorage/sessionStorage 实例。每个 namespace 返回单例。

| 参数        | 类型     | 默认值 | 说明             |
| ----------- | -------- | ------ | ---------------- |
| `namespace` | `string` | `''`   | 存储命名空间前缀 |

### `local` / `session`

默认无命名空间的单例实例。

### `env`

环境检测对象，使用 getter 属性。

| 属性                   | 说明              |
| ---------------------- | ----------------- |
| `env.isWeChat`         | 微信内置浏览器    |
| `env.isAlipay`         | 支付宝内置浏览器  |
| `env.isDingTalk`       | 钉钉内置浏览器    |
| `env.isIframe`         | 在 iframe 中运行  |
| `env.isPWA`            | 作为 PWA 运行     |
| `env.isWebview`        | 在 WebView 中运行 |
| `env.isSsr`            | 服务端渲染        |
| `env.isBrowser`        | 浏览器环境        |
| `env.isMobile`         | 移动设备          |
| `env.isDesktop`        | 桌面设备          |
| `env.isTouchSupported` | 支持触摸输入      |
| `env.isChrome`         | Chrome 浏览器     |
| `env.isSafari`         | Safari 浏览器     |
| `env.isFirefox`        | Firefox 浏览器    |
| `env.isAndroid`        | Android 系统      |
| `env.isIos`            | iOS 系统          |
| `env.isIpadOs`         | iPadOS 系统       |

### `getViewportSize()`

获取当前视口尺寸。

### `getRootScrollTop()` / `getRootScrollLeft()`

获取文档滚动位置。

### `getFileExtension(filename)`

从文件名中提取扩展名。

| 参数       | 类型     | 默认值 | 说明   |
| ---------- | -------- | ------ | ------ |
| `filename` | `string` | -      | 文件名 |

### `formatFileSize(bytes, decimals?)`

将字节数格式化为可读字符串。

| 参数       | 类型     | 默认值 | 说明     |
| ---------- | -------- | ------ | -------- |
| `bytes`    | `number` | -      | 字节数   |
| `decimals` | `number` | `2`    | 小数位数 |

### `downloadFile(arg, filename?, onProgress?)`

下载文件。支持 File、Blob 或 URL 字符串，可选进度回调。

| 参数         | 类型                        | 默认值 | 说明                  |
| ------------ | --------------------------- | ------ | --------------------- |
| `arg`        | `File \| Blob \| string`    | -      | 文件对象、Blob 或 URL |
| `filename`   | `string`                    | -      | 自定义文件名          |
| `onProgress` | `(percent: number) => void` | -      | 进度回调              |

### `getImageInfo(source)`

获取图片宽高信息。支持 File、Blob 或 URL 字符串。

| 参数     | 类型                     | 默认值 | 说明     |
| -------- | ------------------------ | ------ | -------- |
| `source` | `File \| Blob \| string` | -      | 图片来源 |

### `isValidBase64(str)`

检查字符串是否为有效的 base64 编码。

| 参数  | 类型     | 默认值 | 说明           |
| ----- | -------- | ------ | -------------- |
| `str` | `string` | -      | 待校验的字符串 |

### `base64ToFile(base64, filename?)`

将 base64 字符串转换为 File 对象。

| 参数       | 类型     | 默认值   | 说明          |
| ---------- | -------- | -------- | ------------- |
| `base64`   | `string` | -        | base64 字符串 |
| `filename` | `string` | `'file'` | 输出文件名    |

### `fileToBase64(file)`

将 File 或 Blob 转换为 base64 字符串。

| 参数   | 类型           | 默认值 | 说明         |
| ------ | -------------- | ------ | ------------ |
| `file` | `File \| Blob` | -      | 待转换的文件 |

### `isSameFileType(...files)`

基于 Magic Number 检查文件类型是否一致。

| 参数       | 类型     | 默认值 | 说明         |
| ---------- | -------- | ------ | ------------ |
| `...files` | `File[]` | -      | 待比较的文件 |

### `copyToClipboard(content, options?)`

将文本或 Blob 写入系统剪贴板。支持 text/plain 和 text/html。

| 参数      | 类型                                   | 默认值 | 说明         |
| --------- | -------------------------------------- | ------ | ------------ |
| `content` | `string \| Blob`                       | -      | 待复制的内容 |
| `options` | `{ format?: string; debug?: boolean }` | -      | 剪贴板选项   |

### `on(element, event, handler, options?)`

添加事件监听器，断开连接时自动清理。

| 参数      | 类型                      | 默认值 | 说明         |
| --------- | ------------------------- | ------ | ------------ |
| `element` | `EventTarget`             | -      | 目标元素     |
| `event`   | `string`                  | -      | 事件名称     |
| `handler` | `Function`                | -      | 事件处理函数 |
| `options` | `AddEventListenerOptions` | -      | 监听器选项   |

### `off(element, event, handler, options?)`

移除事件监听器。

### `sleep(ms)` / `sleepSync(ms)`

异步/同步延迟辅助函数。

| 参数 | 类型     | 默认值 | 说明       |
| ---- | -------- | ------ | ---------- |
| `ms` | `number` | -      | 延迟毫秒数 |

### `defer(fn)`

在下一个微任务中执行函数。

| 参数 | 类型         | 默认值 | 说明             |
| ---- | ------------ | ------ | ---------------- |
| `fn` | `() => void` | -      | 待延迟执行的函数 |
