# @greypan/browser-kit

[![npm version](https://img.shields.io/npm/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![node version](https://img.shields.io/node/v/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/browser-kit)](https://www.npmjs.com/package/@greypan/browser-kit)

> Browser utilities for namespaced storage, composable telemetry tracking, environment detection, DOM metrics, files, clipboard, events, and session history.

English | [简体中文](./README.CN.md) | [Live demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/browser-kit/getting-started)

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

## Quick start

### Namespaced storage with TTL

`defineLocal(namespace?)` and `defineSession(namespace?)` return cached singletons per namespace. Values are wrapped with metadata so expired keys return the default value and are deleted on read.

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get<{ name: string }>('user') // { name: 'Alice' }

// Expire after one hour (ms)
storage.set('token', 'abc123', 3_600_000)

// Listen for changes from other tabs on the same origin
const unwatch = storage.watch<{ name: string }>('user', (next, prev) => {
  console.log('user changed in another tab', next, prev)
})
unwatch()
```

### Composable telemetry tracker

Start with `defineTracker` and attach plugins with `.use()`. Register `defineBatchTrack()` before `defineLastWords()` and `definePageErrors()` so page exit flushes drain the batch buffer and captured errors go through batching.

```ts
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

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

// Detach global listeners when tearing down
tracker.stop()
```

## Practical usage notes

- **SSR safety.** Every module checks for `window` and `document` before touching browser APIs. `env` reports `isSsr: true`, DOM helpers return `0`, `defineHistoryNav()` returns a no-op instance, and storage degrades without throwing.
- **Restricted storage.** In private browsing or sandboxed iframes where `localStorage` throws `SecurityError`, `storage.set()` returns `false` and `storage.get()` returns the default value. `defineTracker` falls back to an in-memory outbox instead of breaking `track()`.
- **Cross-tab `storage.watch()`.** The browser `storage` event only fires in other tabs of the same origin, never in the tab that called `set()`. Use `BroadcastChannel` or app state if you need same-tab notifications.
- **Tracker transport and CORS.** Default `beaconTransport` tries `navigator.sendBeacon()` first and falls back to `fetch(..., { method: 'POST', keepalive: true, mode: 'no-cors' })`. Both send a JSON string as `text/plain` to avoid CORS preflight requests.
- **Multiple trackers on one origin.** Pass a distinct `persistenceKey` to each `defineTracker()` call so their `localStorage` outbox keys (`tracker:queue:<persistenceKey>`) do not collide.
- **History tracking.** `defineHistoryNav()` is an idempotent singleton that tracks `canGoBack`, `canGoForward`, `currentEntry`, and `entries()` without writing extra fields into `history.state`. Call `dispose()` to restore the native `history.pushState` and `history.replaceState` methods.

## Modules

| Module        | Exports                                                                                                               | Docs                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `storage`     | `defineLocal`, `defineSession`, `local`, `session`                                                                    | [`docs/storage.md`](./docs/storage.md)         |
| `tracker`     | `defineTracker`, `defineBatchTrack`, `defineOfflineRestore`, `defineLastWords`, `definePageErrors`, `beaconTransport` | [`docs/tracker.md`](./docs/tracker.md)         |
| `env`         | `env`                                                                                                                 | [`docs/env.md`](./docs/env.md)                 |
| `dom`         | `getViewportSize`, `getRootScrollTop`, `getRootScrollLeft`                                                            | [`docs/dom.md`](./docs/dom.md)                 |
| `file`        | `downloadFile`, `getImageInfo`, `isValidBase64`, `base64ToFile`, `fileToBase64`, `isSameFileType`                     | [`docs/file.md`](./docs/file.md)               |
| `copy`        | `copyToClipboard`                                                                                                     | [`docs/copy.md`](./docs/copy.md)               |
| `history-nav` | `defineHistoryNav`                                                                                                    | [`docs/history-nav.md`](./docs/history-nav.md) |
| `shortcut`    | `on`, `off`                                                                                                           | [`docs/shortcut.md`](./docs/shortcut.md)       |

> Runtime-agnostic helpers such as `definePlugin`, `parseUrl`, `formatFileSize`, and `debounce` live in [`@greypan/js-kit`](../js-kit/README.md).

## License

MIT
