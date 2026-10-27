# @greypan/browser-kit

> Browser utility functions for storage, tracking, environment detection, and more

English | [简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/README.CN.md)

## Features

- **Storage**: `defineLocal`/`defineSession` with namespace, TTL expiry, cross-tab sync
- **Tracker**: Data tracking with batch aggregation, page-error collection, offline restore, and last-words flush
- **History Nav**: Read-only Navigation API subset tracking back/forward availability (`defineHistoryNav`)
- **Env**: 17 environment detection flags (WeChat, DingTalk, PWA, mobile, etc.)
- **DOM**: Viewport size and scroll position helpers
- **File**: Download, base64 conversion, image info, file type validation
- **Copy**: Cross-browser clipboard API with Blob support
- **Shortcut**: Typed `on`/`off` helpers for `window` and `document` events

## Install

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

## Quick Start

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

// Basic usage
storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// TTL (1 hour)
storage.set('token', 'abc123', 3600_000)

// Watch for cross-tab changes
const unwatch = storage.watch('user', (newVal, oldVal) => {
  console.log('user changed', newVal, oldVal)
})
```

## Plugins

Tracking plugins compose on a core Tracker: `defineTracker(options)` (core transport with a `sendBeacon()` → `fetch(keepalive)` fallback and a persisted pending-transport outbox), `defineBatchTrack(options?)` (delayed batch aggregation with recursive splitting at `maxBatchKB`), `defineOfflineRestore()` (pause while offline, resume on `online`), `definePageErrors(options?)` (collect uncaught errors and unhandled promise rejections as tracker events), and `defineLastWords()` (best-effort `flush()` when the page leaves or hides).

**Recommended composition:**

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

See [`src/tracker/README.md`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/src/tracker/README.md) for the full option tables (including `transport` and `transform`), flush/outbox semantics, and the page-error payload contract.

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

Create namespaced localStorage/sessionStorage instances. Returns singleton per namespace.

| Parameter   | Type     | Default | Description              |
| ----------- | -------- | ------- | ------------------------ |
| `namespace` | `string` | `''`    | Storage namespace prefix |

Full TTL semantics, `watch` cross-tab behavior, and storage-degradation details: see [`src/storage/README.md`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/src/storage/README.md).

### `local` / `session`

Default no-namespace singleton instances.

### `env`

Environment detection object with getter properties.

| Property               | Description             |
| ---------------------- | ----------------------- |
| `env.isWeChat`         | WeChat in-app browser   |
| `env.isAlipay`         | Alipay in-app browser   |
| `env.isDingTalk`       | DingTalk in-app browser |
| `env.isIframe`         | Running in iframe       |
| `env.isPWA`            | Running as PWA          |
| `env.isWebview`        | Running in WebView      |
| `env.isSsr`            | Server-side rendering   |
| `env.isBrowser`        | Browser environment     |
| `env.isMobile`         | Mobile device           |
| `env.isDesktop`        | Desktop device          |
| `env.isTouchSupported` | Touch input supported   |
| `env.isChrome`         | Chrome browser          |
| `env.isSafari`         | Safari browser          |
| `env.isFirefox`        | Firefox browser         |
| `env.isAndroid`        | Android OS              |
| `env.isIos`            | iOS OS                  |
| `env.isIpadOs`         | iPadOS                  |

Full flag conditions and pre-render caveats: see [`src/env/README.md`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/src/env/README.md).

### `getViewportSize()`

Get current viewport dimensions.

**Returns:** `{ width: number; height: number }`. Returns zeros when `window` is unavailable.

### `getRootScrollTop()` / `getRootScrollLeft()`

Get the document scroll position. Returns `0` outside the browser.

### `downloadFile(arg, filename?, onProgress?)`

Download a file. Supports File, Blob, or URL string. For a remote URL, `onProgress` receives the download percentage.

| Parameter    | Type                        | Default | Description               |
| ------------ | --------------------------- | ------- | ------------------------- |
| `arg`        | `File \| Blob \| string`    | -       | File object, Blob, or URL |
| `filename`   | `string`                    | -       | Custom filename           |
| `onProgress` | `(percent: number) => void` | -       | Progress callback         |

### `getImageInfo(source)`

Resolve image width and height. Supports File, Blob, or URL string.

| Parameter | Type                     | Default | Description  |
| --------- | ------------------------ | ------- | ------------ |
| `source`  | `File \| Blob \| string` | -       | Image source |

**Returns:** `Promise<{ width: number; height: number }>`.

### `isValidBase64(str)`

Check if a string is valid base64. Both raw base64 and `data:` URLs are accepted.

| Parameter | Type     | Default | Description        |
| --------- | -------- | ------- | ------------------ |
| `str`     | `string` | -       | String to validate |

### `base64ToFile(base64, filename?)`

Convert a base64 string or `data:` URL to a File object. When `filename` has no extension, one is derived from the MIME type.

| Parameter  | Type     | Default  | Description     |
| ---------- | -------- | -------- | --------------- |
| `base64`   | `string` | -        | Base64 string   |
| `filename` | `string` | `'file'` | Output filename |

### `fileToBase64(file)`

Convert File or Blob to a base64 `data:` URL.

| Parameter | Type           | Default | Description             |
| --------- | -------------- | ------- | ----------------------- |
| `file`    | `File \| Blob` | -       | File or Blob to convert |

**Returns:** `Promise<string>`.

### `isSameFileType(...files)`

Check whether files share the same real type based on their Magic Number. A single file, or no files, returns `true`.

| Parameter  | Type     | Default | Description      |
| ---------- | -------- | ------- | ---------------- |
| `...files` | `File[]` | -       | Files to compare |

**Returns:** `Promise<boolean>`.

Magic Number comparison and error behavior: see [`src/file/README.md`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/src/file/README.md).

### `copyToClipboard(content, options?)`

Copy text or Blob to the system clipboard. Supports `text/plain` and `text/html`. Failures are handled by the underlying fallback chain and are not rethrown.

| Parameter | Type                                   | Default | Description       |
| --------- | -------------------------------------- | ------- | ----------------- |
| `content` | `string \| Blob`                       | -       | Content to copy   |
| `options` | `{ format?: string; debug?: boolean }` | -       | Clipboard options |

### `on(element, event, handler, options?)`

Add an event listener to `window` or `document`.

| Parameter | Type                      | Default | Description      |
| --------- | ------------------------- | ------- | ---------------- |
| `element` | `Window \| Document`      | -       | Event target     |
| `event`   | `string`                  | -       | Event name       |
| `handler` | `Function`                | -       | Event handler    |
| `options` | `AddEventListenerOptions` | -       | Listener options |

### `off(element, event, handler, options?)`

Remove a listener added with `on`.

### `defineHistoryNav(options?)`

Track whether the user can go back / forward in the real browser history via a read-only subset of the Navigation API (`canGoBack` / `canGoForward` / `currentEntry` / `entries()` / `currententrychange`). It patches `pushState` / `replaceState` only as a side record and also handles `popstate` and `hashchange`; the first call returns an idempotent singleton. See [`src/history-nav/README.md`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/browser-kit/src/history-nav/README.md) for the full API and known limitations.

> String and number helpers such as `getFileExtension` and `formatFileSize` live in [`@greypan/js-kit`](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/js-kit/README.md), not in this package.
