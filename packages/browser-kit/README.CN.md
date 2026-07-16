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

核心埋点插件。通过 sendBeacon 发送数据，fetch 降级兜底。

| 参数      | 类型                                         | 默认值 | 说明     |
| --------- | -------------------------------------------- | ------ | -------- |
| `options` | `{ endpoint: string; sendBeacon?: boolean }` | -      | 埋点配置 |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
const ctx = tracker.make()
ctx.send({ event: 'page_view', path: '/' })
```

### `defineBatchTrack(options?)`

批量聚合插件。收集事件并批量发送，支持 64KB beacon 分片。

| 参数      | 类型                      | 默认值                 | 说明     |
| --------- | ------------------------- | ---------------------- | -------- |
| `options` | `{ batchDelay?: number }` | `{ batchDelay: 3000 }` | 批量配置 |

### `defineLastWords()`

临终遗言插件。在页面关闭或切到后台时立即发送待发数据。

### `defineOfflineRestore()`

离线恢复插件。断网时将数据存入 IndexedDB，重连后自动恢复。

**组合示例：**

```ts
import { defineTracker, defineBatchTrack, defineLastWords, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack())
  .use(defineLastWords())
  .use(defineOfflineRestore())
  .make()
```

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
