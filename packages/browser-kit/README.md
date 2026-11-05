# @greypan/browser-kit

> Browser APIs for storage, tracking, environment detection, files, clipboard, and history.

English | [简体中文](./README.CN.md)

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

## Quick start

```ts
import { defineLocal } from '@greypan/browser-kit'

const storage = defineLocal('my-app')

storage.set('user', { name: 'Alice' })
storage.get('user') // { name: 'Alice' }

// Expire after one hour
storage.set('token', 'abc123', 3600_000)

// Listen for changes from other tabs
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed', newValue, oldValue)
})
```

## Storage

`defineLocal(namespace?)` and `defineSession(namespace?)` create namespaced localStorage and sessionStorage instances with TTL support and cross-tab change events. `local` and `session` are the default instances without a namespace.

See [`src/storage/README.md`](./src/storage/README.md) for the full API.

## Tracking

Tracking uses composable plugins. Start with `defineTracker`, then add only the behavior you need.

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

- `defineBatchTrack` collects events and sends them in batches.
- `defineOfflineRestore` pauses while the browser is offline and resumes when it comes back.
- `definePageErrors` reports uncaught errors and unhandled promise rejections.
- `defineLastWords` flushes pending events when the page is hidden or about to close.

`defineTracker` stores pending events in localStorage by default and retries them later. It uses `navigator.sendBeacon()` first and falls back to `fetch()` with `keepalive: true`.

See [`src/tracker/README.md`](./src/tracker/README.md) for options, retry behavior, and the page error payload.

## Environment detection

`env` exposes boolean properties for the current browser and device.

```ts
import { env } from '@greypan/browser-kit'

if (env.isMobile && env.isWeChat) {
  // WeChat mobile flow
}
```

It covers WeChat, Alipay, DingTalk, iframe, PWA, WebView, SSR, mobile, desktop, touch input, Chrome, Safari, Firefox, Android, iOS, and iPadOS.

See [`src/env/README.md`](./src/env/README.md) for the full list and SSR notes.

## DOM helpers

### `getViewportSize()`

Return the current viewport size as `{ width, height }`. Returns zeros when `window` is unavailable.

### `getRootScrollTop()` / `getRootScrollLeft()`

Return the document scroll position. Returns `0` outside the browser.

## Files

### `downloadFile(arg, filename?, onProgress?)`

Download a `File`, `Blob`, or remote URL. For a remote URL, `onProgress` receives the download percentage.

| Parameter    | Type                        | Description                 |
| ------------ | --------------------------- | --------------------------- |
| `arg`        | `File \| Blob \| string`    | File, Blob, or absolute URL |
| `filename`   | `string`                    | Optional output filename    |
| `onProgress` | `(percent: number) => void` | Optional progress callback  |

### `getImageInfo(source)`

Return the image width and height for a `File`, `Blob`, or URL.

### `isValidBase64(str)`

Check whether a string is valid base64. Raw base64 and `data:` URLs are accepted.

### `base64ToFile(base64, filename?)`

Convert base64 or a `data:` URL to a `File`.

### `fileToBase64(file)`

Convert a `File` or `Blob` to a base64 `data:` URL.

### `isSameFileType(...files)`

Compare files by their leading bytes and return whether they share the same real type.

See [`src/file/README.md`](./src/file/README.md) for error behavior and edge cases.

## Clipboard

### `copyToClipboard(content, options?)`

Copy text or a `Blob` to the system clipboard. `text/plain` and `text/html` are supported. Copy failures are handled internally and are not rethrown.

| Parameter | Type                                   | Description       |
| --------- | -------------------------------------- | ----------------- |
| `content` | `string \| Blob`                       | Content to copy   |
| `options` | `{ format?: string; debug?: boolean }` | Clipboard options |

## Events

### `on(element, event, handler, options?)`

Add a listener to `window` or `document` with typed helpers.

### `off(element, event, handler, options?)`

Remove a listener added with `on`.

## History

### `defineHistoryNav(options?)`

Track whether the user can go back or forward within the current document session. The instance exposes `canGoBack`, `canGoForward`, `currentEntry`, `entries()`, `onCurrentEntryChange()`, and `dispose()`.

It is idempotent, so later calls return the same instance. When `window` is unavailable, it returns a no-op instance.

See [`src/history-nav/README.md`](./src/history-nav/README.md) for the entry shape and known limits.

> String and number helpers such as `getFileExtension` and `formatFileSize` live in [`@greypan/js-kit`](./../js-kit/README.md).
