---
title: 环境检测
---

# 环境检测

`env` 提供按需计算的布尔属性，用于检测当前运行环境、浏览器内核、操作系统、宿主容器（微信、支付宝、钉钉、iframe、PWA、WebView）以及触摸输入支持；所有属性在 SSR 环境下均安全降级。

## 读取运行时环境标识

直接访问 `env` 上的属性以区分不同平台或容器逻辑。

```ts demo=env-inspector
import { env } from '@greypan/browser-kit'

const snapshot = {
  isBrowser: env.isBrowser,
  isSsr: env.isSsr,
  isMobile: env.isMobile,
  isDesktop: env.isDesktop,
  isTouchSupported: env.isTouchSupported,
  isChrome: env.isChrome,
  isSafari: env.isSafari,
  isFirefox: env.isFirefox,
  isIframe: env.isIframe,
  isPWA: env.isPWA
}

console.log(snapshot)
```

```js
import { env } from '@greypan/browser-kit'

const snapshot = {
  isBrowser: env.isBrowser,
  isSsr: env.isSsr,
  isMobile: env.isMobile,
  isDesktop: env.isDesktop,
  isTouchSupported: env.isTouchSupported,
  isChrome: env.isChrome,
  isSafari: env.isSafari,
  isFirefox: env.isFirefox,
  isIframe: env.isIframe,
  isPWA: env.isPWA
}

console.log(snapshot)
```

## 属性分类

- **运行环境**：`isBrowser`、`isSsr`、`isIframe`、`isPWA`、`isWebview`
- **设备与输入**：`isMobile`、`isDesktop`、`isTouchSupported`
- **操作系统**：`isAndroid`、`isIos`、`isIpadOs`
- **浏览器**：`isChrome`、`isSafari`、`isFirefox`
- **宿主容器**：`isWeChat`、`isAlipay`、`isDingTalk`
