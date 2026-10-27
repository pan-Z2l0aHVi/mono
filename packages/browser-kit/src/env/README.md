# Env

Browser and OS detection flags

English | [简体中文](./README.CN.md)

## Overview

`env` is a single object of getters evaluated at access time. It has no state and no side effects, and it is re-exported by `@greypan/browser-kit` as `env`.

The object is meant to be read in the browser. Most flags are safe to read during pre-render because they test the `userAgent` captured at module load. `isIpadOs`, `isChrome`, and `isSafari` read `navigator` at access time without an SSR guard, so evaluate those in the browser.

## API

### `env`

| Property               | Description                                                    |
| ---------------------- | -------------------------------------------------------------- |
| `env.isWeChat`         | WeChat in-app browser (`MicroMessenger`)                       |
| `env.isAlipay`         | Alipay in-app browser (`AlipayClient`)                         |
| `env.isDingTalk`       | DingTalk in-app browser (`DingTalk`)                           |
| `env.isIframe`         | The page is not the top-level window                           |
| `env.isPWA`            | `display-mode: standalone` matches                             |
| `env.isWebview`        | WebView UA marker, or mobile WebKit without Safari             |
| `env.isSsr`            | No `window` or `document`                                      |
| `env.isBrowser`        | Both `window` and `document` exist                             |
| `env.isMobile`         | Mobile UA (Android, iOS, BlackBerry, Opera Mini, …)            |
| `env.isDesktop`        | Not `isMobile`                                                 |
| `env.isTouchSupported` | `ontouchstart` exists or `navigator.maxTouchPoints > 0`        |
| `env.isChrome`         | Chrome UA with a Google vendor string                          |
| `env.isSafari`         | Safari UA with an Apple vendor string                          |
| `env.isFirefox`        | Firefox UA                                                     |
| `env.isAndroid`        | Android UA                                                     |
| `env.isIos`            | iPad / iPhone / iPod UA                                        |
| `env.isIpadOs`         | iPad UA, or desktop-class Safari with `MacIntel` + multi-touch |

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // WeChat mobile flow
}
```

## Notes

- `isMobile` is UA-based, so an iPad reports `true`; use `isIos` / `isIpadOs` for the platform split.
- `isDesktop` is the negation of `isMobile`, not a separate check.
- `isIpadOs`, `isChrome`, and `isSafari` read `navigator` when accessed, so evaluate them in the browser rather than during pre-render.
