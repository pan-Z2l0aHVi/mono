# @greypan/browser-kit

> 浏览器存储、埋点、环境检测、文件、剪贴板与历史记录工具。

[English](./README.md) | 简体中文

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

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// 一小时后过期
storage.set('token', 'abc123', 3600_000)

// 监听其他 tab 的变更
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
```

## 存储

`defineLocal(namespace?)` 与 `defineSession(namespace?)` 创建带命名空间的 localStorage 和 sessionStorage 实例，支持 TTL 与跨 tab 变更事件。`local` 和 `session` 是不带命名空间的默认实例。

完整 API 见 [`src/storage/README.CN.md`](./src/storage/README.CN.md)。

## 埋点

埋点由可组合插件提供。先用 `defineTracker`，再按需添加行为。

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
```

- `defineBatchTrack` 收集事件并批量发送。
- `defineOfflineRestore` 浏览器离线时暂停，恢复联网后继续。
- `definePageErrors` 上报未捕获异常与未处理的 Promise rejection。
- `defineLastWords` 在页面隐藏或即将关闭时发送待处理事件。

`defineTracker` 默认把待发送事件保存在 localStorage 中，之后重试。它优先使用 `navigator.sendBeacon()`，失败时降级到带 `keepalive: true` 的 `fetch()`。

参数、重试行为与页面错误数据结构见 [`src/tracker/README.CN.md`](./src/tracker/README.CN.md)。

## 环境检测

`env` 用布尔属性描述当前浏览器与设备。

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // 微信移动端流程
}
```

覆盖微信、支付宝、钉钉、iframe、PWA、WebView、SSR、移动端、桌面端、触摸输入、Chrome、Safari、Firefox、Android、iOS 与 iPadOS。

完整列表与 SSR 注意事项见 [`src/env/README.CN.md`](./src/env/README.CN.md)。

## DOM 工具

### `getViewportSize()`

返回当前视口尺寸 `{ width, height }`。`window` 不可用时返回 0。

### `getRootScrollTop()` / `getRootScrollLeft()`

返回文档滚动位置。在浏览器外返回 `0`。

## 文件

### `downloadFile(arg, filename?, onProgress?)`

下载 `File`、`Blob` 或远程 URL。远程 URL 下载时，`onProgress` 收到下载百分比。

| 参数         | 类型                        | 说明                  |
| ------------ | --------------------------- | --------------------- |
| `arg`        | `File \| Blob \| string`    | 文件、Blob 或绝对 URL |
| `filename`   | `string`                    | 可选输出文件名        |
| `onProgress` | `(percent: number) => void` | 可选进度回调          |

### `getImageInfo(source)`

返回 `File`、`Blob` 或 URL 对应图片的宽高。

### `isValidBase64(str)`

检查字符串是否为有效 base64。原始 base64 与 `data:` URL 都接受。

### `base64ToFile(base64, filename?)`

把 base64 或 `data:` URL 转成 `File`。

### `fileToBase64(file)`

把 `File` 或 `Blob` 转成 base64 `data:` URL。

### `isSameFileType(...files)`

按文件开头字节比较，判断它们是否属于同一种真实类型。

错误行为与边界情况见 [`src/file/README.CN.md`](./src/file/README.CN.md)。

## 剪贴板

### `copyToClipboard(content, options?)`

把文本或 `Blob` 写入系统剪贴板，支持 `text/plain` 与 `text/html`。复制失败在内部处理，不会重新抛出。

| 参数      | 类型                                   | 说明       |
| --------- | -------------------------------------- | ---------- |
| `content` | `string \| Blob`                       | 待复制内容 |
| `options` | `{ format?: string; debug?: boolean }` | 剪贴板参数 |

## 事件

### `on(element, event, handler, options?)`

给 `window` 或 `document` 添加带类型提示的监听器。

### `off(element, event, handler, options?)`

移除由 `on` 添加的监听器。

## 历史记录

### `defineHistoryNav(options?)`

跟踪当前文档会话内能否后退或前进。实例提供 `canGoBack`、`canGoForward`、`currentEntry`、`entries()`、`onCurrentEntryChange()` 和 `dispose()`。

它是幂等的，后续调用返回同一实例。`window` 不可用时返回空实现。

条目结构与已知限制见 [`src/history-nav/README.CN.md`](./src/history-nav/README.CN.md)。

> `getFileExtension` 与 `formatFileSize` 这类字符串与数字工具位于 [`@greypan/js-kit`](./../js-kit/README.CN.md)。
