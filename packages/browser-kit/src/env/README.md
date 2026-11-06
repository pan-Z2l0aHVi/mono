# Env

> Detect the current browser, device, and runtime.

English | [简体中文](./README.CN.md)

## Overview

`env` is one object of boolean properties. Each value is read when you access it. It has no state and no side effects. `@greypan/browser-kit` re-exports it as `env`.

Read most flags during pre-render without a problem. `isIpadOs`, `isChrome`, and `isSafari` access `navigator` directly, so read them in the browser.

## API

### `env`

| Property               | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `env.isWeChat`         | WeChat in-app browser (`MicroMessenger`).                             |
| `env.isAlipay`         | Alipay in-app browser (`AlipayClient`).                               |
| `env.isDingTalk`       | DingTalk in-app browser (`DingTalk`).                                 |
| `env.isIframe`         | The page is not the top-level window.                                 |
| `env.isPWA`            | `display-mode: standalone` matches.                                   |
| `env.isWebview`        | WebView user agent, or mobile WebKit without Safari.                  |
| `env.isSsr`            | No `window` or `document`.                                            |
| `env.isBrowser`        | Both `window` and `document` exist.                                   |
| `env.isMobile`         | Mobile user agent (Android, iOS, BlackBerry, Opera Mini, and others). |
| `env.isDesktop`        | Not mobile.                                                           |
| `env.isTouchSupported` | `ontouchstart` exists or `navigator.maxTouchPoints > 0`.              |
| `env.isChrome`         | Chrome user agent with a Google vendor string.                        |
| `env.isSafari`         | Safari user agent with an Apple vendor string.                        |
| `env.isFirefox`        | Firefox user agent.                                                   |
| `env.isAndroid`        | Android user agent.                                                   |
| `env.isIos`            | iPad, iPhone, or iPod user agent.                                     |
| `env.isIpadOs`         | iPad user agent, or desktop Safari on `MacIntel` with multi-touch.    |

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // WeChat mobile flow
}
```

## Notes

- `isMobile` uses the user agent, so an iPad reports `true`. Use `isIos` or `isIpadOs` for a platform check.
- `isDesktop` is the opposite of `isMobile`.
- Read `isIpadOs`, `isChrome`, and `isSafari` in the browser, not during pre-render.
