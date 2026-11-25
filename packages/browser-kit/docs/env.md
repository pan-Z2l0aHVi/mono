---
title: Environment
---

# Environment

`env` exposes lazy boolean getters for inspecting the current runtime, browser engine, operating system, container (WeChat, Alipay, DingTalk, iframe, PWA, WebView), and input capabilities. All getters degrade safely under SSR.

## Inspecting runtime flags

Read properties directly from `env` to branch UI or feature behavior.

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

## Properties

- **Runtime**: `isBrowser`, `isSsr`, `isIframe`, `isPWA`, `isWebview`
- **Device & input**: `isMobile`, `isDesktop`, `isTouchSupported`
- **OS**: `isAndroid`, `isIos`, `isIpadOs`
- **Browser**: `isChrome`, `isSafari`, `isFirefox`
- **Super-app containers**: `isWeChat`, `isAlipay`, `isDingTalk`
