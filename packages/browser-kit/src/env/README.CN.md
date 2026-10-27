# Env

浏览器与操作系统环境检测标志

[English](./README.md) | 简体中文

## 概览

`env` 是一个由 getter 组成的单一对象，访问时才求值。它没有状态、没有副作用，并由 `@greypan/browser-kit` 以 `env` 重新导出。

这个对象用于在浏览器中读取。多数标志基于模块加载时捕获的 `userAgent`，在预渲染阶段读取是安全的。`isIpadOs`、`isChrome` 与 `isSafari` 在访问时直接读 `navigator`，没有 SSR 守卫，请在浏览器中求值。

## API

### `env`

| 属性                   | 说明                                                   |
| ---------------------- | ------------------------------------------------------ |
| `env.isWeChat`         | 微信内置浏览器（`MicroMessenger`）                     |
| `env.isAlipay`         | 支付宝内置浏览器（`AlipayClient`）                     |
| `env.isDingTalk`       | 钉钉内置浏览器（`DingTalk`）                           |
| `env.isIframe`         | 页面不在顶层 window 中                                 |
| `env.isPWA`            | 匹配 `display-mode: standalone`                        |
| `env.isWebview`        | UA 含 WebView 标记，或移动端 WebKit 且不含 Safari      |
| `env.isSsr`            | 没有 `window` 或 `document`                            |
| `env.isBrowser`        | `window` 与 `document` 同时存在                        |
| `env.isMobile`         | 移动端 UA（Android、iOS、BlackBerry、Opera Mini 等）   |
| `env.isDesktop`        | `isMobile` 取反                                        |
| `env.isTouchSupported` | 存在 `ontouchstart`，或 `navigator.maxTouchPoints > 0` |
| `env.isChrome`         | Chrome UA 且 vendor 为 Google                          |
| `env.isSafari`         | Safari UA 且 vendor 为 Apple                           |
| `env.isFirefox`        | Firefox UA                                             |
| `env.isAndroid`        | Android UA                                             |
| `env.isIos`            | iPad / iPhone / iPod UA                                |
| `env.isIpadOs`         | iPad UA，或 `MacIntel` + 多点触控的桌面级 Safari       |

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // 微信移动端流程
}
```

## 说明

- `isMobile` 基于 UA，iPad 也会返回 `true`；平台细分请用 `isIos` / `isIpadOs`。
- `isDesktop` 是 `isMobile` 的取反，不是独立判断。
- `isIpadOs`、`isChrome` 与 `isSafari` 在访问时读取 `navigator`，请在浏览器中求值，不要在预渲染阶段判断。
