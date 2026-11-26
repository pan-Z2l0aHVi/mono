# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> Framework-free browser utilities for namespaced storage, composable telemetry tracking, environment detection, DOM metrics, file handling, clipboard, DOM events, and same-document history navigation.

English | [简体中文](./README.CN.md) | [Live demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

- **Target runtime**: Modern browsers (`Chrome >= 111`, `Edge >= 111`, `Safari / iOS >= 16.4`, `Firefox >= 128`).
- **Zero framework lock-in**: No React, Vue, or Angular runtime dependency.
- **ESM-only & tree-shakable**: Published as unbundled ES modules with `"sideEffects": false` and subpath exports (`@greypan/browser-kit/<module>`).
- **Full TypeScript types**: Bundled `.d.ts` declarations for the root entry and every subpath.

## Install

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

Import from `@greypan/browser-kit` or directly from a module subpath such as `@greypan/browser-kit/storage`.

## Quick start

### Namespaced storage with TTL

`defineLocal(namespace?)` and `defineSession(namespace?)` return a cached singleton per namespace. Values are stored with metadata so expired keys return the default value and are removed on read.

```ts
import { defineLocal } from '@greypan/browser-kit/storage'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get<{ name: string }>('user') // { name: 'Alice' }

// Expire after one hour (ms)
storage.set('token', 'abc123', 3_600_000)

// Listen for changes made in other tabs on the same origin
const unwatch = storage.watch<{ name: string }>('user', (next, prev) => {
  console.log('user changed in another tab', next, prev)
})
unwatch()
```

### Composable telemetry tracker

Start with `defineTracker()` and layer capabilities with `.use()`. Register `defineBatchTrack()` before `defineLastWords()` and `definePageErrors()` so page exit flushes drain the batch buffer and captured page errors go through batching.

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

// Detach global listeners on teardown (does not clear the outbox)
tracker.stop()
```

### Clipboard and history navigation

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

## Modules

| Subpath                            | Key exports                                                                                        | Use case                                                                                           | Docs                                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `@greypan/browser-kit/storage`     | `defineLocal`, `defineSession`, `local`, `session`                                                 | Namespaced `localStorage` / `sessionStorage` with TTL, quota cleanup, and cross-tab `watch()`      | [`docs/storage.md`](./docs/storage.md)         |
| `@greypan/browser-kit/tracker`     | `defineTracker`, `defineBatchTrack`, `defineOfflineRestore`, `defineLastWords`, `definePageErrors` | Composable telemetry queue with batching, 64 KB splitting, offline resume, exit flush, page errors | [`docs/tracker.md`](./docs/tracker.md)         |
| `@greypan/browser-kit/env`         | `env`                                                                                              | Lazy UA and feature flags for OS, browser, WebView, WeChat/Alipay/DingTalk, iframe, PWA, and SSR   | [`docs/env.md`](./docs/env.md)                 |
| `@greypan/browser-kit/dom`         | `getViewportSize`, `getRootScrollTop`, `getRootScrollLeft`                                         | Viewport size and root scroll offsets with SSR fallbacks                                           | [`docs/dom.md`](./docs/dom.md)                 |
| `@greypan/browser-kit/file`        | `downloadFile`, `getImageInfo`, `isValidBase64`, `base64ToFile`, `fileToBase64`, `isSameFileType`  | Streamed file download with progress, image size, Base64 conversion, and magic-number type checks  | [`docs/file.md`](./docs/file.md)               |
| `@greypan/browser-kit/copy`        | `copyToClipboard`                                                                                  | Clipboard writes for strings and `Blob`s with MIME support and fallback                            | [`docs/copy.md`](./docs/copy.md)               |
| `@greypan/browser-kit/history-nav` | `defineHistoryNav`                                                                                 | Read-only same-document navigation stack (`canGoBack`, `canGoForward`, `entries()`)                | [`docs/history-nav.md`](./docs/history-nav.md) |
| `@greypan/browser-kit/shortcut`    | `on`, `off`                                                                                        | Typed `addEventListener` / `removeEventListener` wrappers for `Window` and `Document`              | [`docs/shortcut.md`](./docs/shortcut.md)       |

## Compatibility and boundaries

- **SSR behavior**: `dom` helpers return `0` / `{ width: 0, height: 0 }`, `defineHistoryNav()` returns a no-op instance, `env.isSsr` / `env.isBrowser` report the environment, `storage` reads/writes degrade without throwing, and tracker lifecycle plugins (`defineLastWords`, `defineOfflineRestore`, `definePageErrors`) no-op while keeping `stop()`. Browser-only operations (`file`, `copy`, `shortcut`, `storage.watch()`, and `navigator`-dependent `env` getters such as `isIpadOs`, `isChrome`, `isSafari`) require a browser environment.
- **Restricted storage & quota**: In private browsing or sandboxed iframes where `localStorage` / `sessionStorage` throws `SecurityError`, `storage.set()` returns `false` and `storage.get()` returns the default value. On `QuotaExceededError`, `storage.set()` purges expired keys in the namespace via `clearUseless()` and retries once. `defineTracker()` falls back to an in-memory outbox if persistence fails (at-least-once delivery semantics).
- **Cross-tab `storage.watch()`**: Native `storage` events only fire in other tabs on the same origin, never in the tab that called `set()`. Use `BroadcastChannel` or application state for same-tab notifications.
- **Tracker transport & CORS**: The default transport tries `navigator.sendBeacon()` first and falls back to `fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors' })`. Both send a JSON string as `text/plain` to avoid CORS preflight requests. Pass a custom `transport` option to `defineTracker()` to replace it.
- **Multiple trackers on one origin**: Pass a distinct `persistenceKey` to each `defineTracker()` call so their `localStorage` outbox keys (`tracker:queue:<persistenceKey>`) do not collide.
- **Clipboard fallback**: `copyToClipboard()` delegates to `copy-to-clipboard`, using `navigator.clipboard` in secure contexts and falling back to `document.execCommand('copy')`. When given a `Blob`, it reads the text and infers the MIME type from `options.format || blob.type || 'text/plain'`.
- **History navigation scope**: `defineHistoryNav()` is an idempotent singleton that tracks same-document navigation (`pushState`, `replaceState`, `popstate`, `hashchange`) in a sidecar stack persisted to `sessionStorage` (falling back to memory if blocked), without writing to `history.state`. Cross-document loads and `'reload'` detection are out of scope. Call `dispose()` to restore native `history.pushState` and `history.replaceState`.

> Runtime-agnostic helpers such as `definePlugin`, `parseUrl`, `formatFileSize`, and `debounce` live in [`@greypan/js-kit`](../js-kit/README.md).

## License

MIT
