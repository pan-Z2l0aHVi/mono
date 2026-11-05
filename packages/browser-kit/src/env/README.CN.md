# Env

> 检测当前浏览器、设备与运行环境。

[English](./README.md) | 简体中文

## 概述

`env` 是一个由布尔属性组成的对象。每个值在访问时读取，没有状态，也没有副作用。`@greypan/browser-kit` 以 `env` 重新导出它。

多数标志可以在预渲染阶段读取。`isIpadOs`、`isChrome` 和 `isSafari` 会直接访问 `navigator`，请在浏览器中读取。

## API

### `env`

| 属性                   | 说明                                                           |
| ---------------------- | -------------------------------------------------------------- |
| `env.isWeChat`         | 微信内置浏览器（`MicroMessenger`）。                           |
| `env.isAlipay`         | 支付宝内置浏览器（`AlipayClient`）。                           |
| `env.isDingTalk`       | 钉钉内置浏览器（`DingTalk`）。                                 |
| `env.isIframe`         | 页面不在顶层 window。                                          |
| `env.isPWA`            | 匹配 `display-mode: standalone`。                              |
| `env.isWebview`        | User agent 含 WebView 标记，或是没有 Safari 的移动 WebKit。    |
| `env.isSsr`            | 没有 `window` 或 `document`。                                  |
| `env.isBrowser`        | `window` 与 `document` 同时存在。                              |
| `env.isMobile`         | 移动端 user agent（Android、iOS、BlackBerry、Opera Mini 等）。 |
| `env.isDesktop`        | 不是移动端。                                                   |
| `env.isTouchSupported` | 存在 `ontouchstart`，或 `navigator.maxTouchPoints > 0`。       |
| `env.isChrome`         | Chrome user agent，且 vendor 为 Google。                       |
| `env.isSafari`         | Safari user agent，且 vendor 为 Apple。                        |
| `env.isFirefox`        | Firefox user agent。                                           |
| `env.isAndroid`        | Android user agent。                                           |
| `env.isIos`            | iPad、iPhone 或 iPod user agent。                              |
| `env.isIpadOs`         | iPad user agent，或 `MacIntel` + 多点触控的桌面 Safari。       |

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // 微信移动端流程
}
```

## 说明

- `isMobile` 基于 user agent，iPad 也会返回 `true`。平台判断请用 `isIos` 或 `isIpadOs`。
- `isDesktop` 是 `isMobile` 的反面。
- 请在浏览器中读取 `isIpadOs`、`isChrome` 和 `isSafari`，不要在预渲染阶段读取。
