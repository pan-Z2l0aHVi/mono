# @greypan/browser-kit

> Browser utility functions for storage, tracking, environment detection, and more

English | [简体中文](./README.CN.md)

## Features

- **Storage**: `defineLocal`/`defineSession` with namespace, TTL expiry, cross-tab sync
- **Tracker**: Data tracking with batch aggregation, offline restore, and last-words flush
- **Env**: 17 environment detection flags (WeChat, DingTalk, PWA, mobile, etc.)
- **DOM**: Viewport size and scroll position helpers
- **File**: Download, base64 conversion, image info, file type validation
- **Copy**: Cross-browser clipboard API with Blob support
- **Shortcut**: Event helpers (`on`/`off`), async helpers (`sleep`/`sleepSync`/`defer`)

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

### `defineTracker(options)`

Core tracking plugin. Sends data via sendBeacon with fetch fallback.

| Parameter | Type                                         | Default | Description           |
| --------- | -------------------------------------------- | ------- | --------------------- |
| `options` | `{ endpoint: string; sendBeacon?: boolean }` | -       | Tracker configuration |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
const ctx = tracker.make()
ctx.send({ event: 'page_view', path: '/' })
```

### `defineBatchTrack(options?)`

Batch aggregation plugin. Collects events and sends them in batches, with 64KB beacon splitting.

| Parameter | Type                      | Default                | Description         |
| --------- | ------------------------- | ---------------------- | ------------------- |
| `options` | `{ batchDelay?: number }` | `{ batchDelay: 3000 }` | Batch configuration |

### `defineLastWords()`

Last-words plugin. Flushes pending data on page close or visibility change.

### `defineOfflineRestore()`

Offline restore plugin. Saves data to IndexedDB when offline and restores on reconnect.

**Composition example:**

```ts
import { defineTracker, defineBatchTrack, defineLastWords, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack())
  .use(defineLastWords())
  .use(defineOfflineRestore())
  .make()
```

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

Create namespaced localStorage/sessionStorage instances. Returns singleton per namespace.

| Parameter   | Type     | Default | Description              |
| ----------- | -------- | ------- | ------------------------ |
| `namespace` | `string` | `''`    | Storage namespace prefix |

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

### `getViewportSize()`

Get current viewport dimensions.

### `getRootScrollTop()` / `getRootScrollLeft()`

Get document scroll position.

### `getFileExtension(filename)`

Extract file extension from filename.

| Parameter  | Type     | Default | Description     |
| ---------- | -------- | ------- | --------------- |
| `filename` | `string` | -       | Filename string |

### `formatFileSize(bytes, decimals?)`

Format byte count to human-readable string.

| Parameter  | Type     | Default | Description    |
| ---------- | -------- | ------- | -------------- |
| `bytes`    | `number` | -       | Byte count     |
| `decimals` | `number` | `2`     | Decimal places |

### `downloadFile(arg, filename?, onProgress?)`

Download a file. Supports File, Blob, or URL string. Optional progress callback.

| Parameter    | Type                        | Default | Description               |
| ------------ | --------------------------- | ------- | ------------------------- |
| `arg`        | `File \| Blob \| string`    | -       | File object, Blob, or URL |
| `filename`   | `string`                    | -       | Custom filename           |
| `onProgress` | `(percent: number) => void` | -       | Progress callback         |

### `getImageInfo(source)`

Get image width and height. Supports File, Blob, or URL string.

| Parameter | Type                     | Default | Description  |
| --------- | ------------------------ | ------- | ------------ |
| `source`  | `File \| Blob \| string` | -       | Image source |

### `isValidBase64(str)`

Check if a string is valid base64.

| Parameter | Type     | Default | Description        |
| --------- | -------- | ------- | ------------------ |
| `str`     | `string` | -       | String to validate |

### `base64ToFile(base64, filename?)`

Convert base64 string to File object.

| Parameter  | Type     | Default  | Description     |
| ---------- | -------- | -------- | --------------- |
| `base64`   | `string` | -        | Base64 string   |
| `filename` | `string` | `'file'` | Output filename |

### `fileToBase64(file)`

Convert File or Blob to base64 string.

| Parameter | Type           | Default | Description             |
| --------- | -------------- | ------- | ----------------------- |
| `file`    | `File \| Blob` | -       | File or Blob to convert |

### `isSameFileType(...files)`

Check if files have the same type based on Magic Number.

| Parameter  | Type     | Default | Description      |
| ---------- | -------- | ------- | ---------------- |
| `...files` | `File[]` | -       | Files to compare |

### `copyToClipboard(content, options?)`

Copy text or Blob to system clipboard. Supports text/plain and text/html.

| Parameter | Type                                   | Default | Description       |
| --------- | -------------------------------------- | ------- | ----------------- |
| `content` | `string \| Blob`                       | -       | Content to copy   |
| `options` | `{ format?: string; debug?: boolean }` | -       | Clipboard options |

### `on(element, event, handler, options?)`

Add event listener with automatic cleanup on disconnect.

| Parameter | Type                      | Default | Description      |
| --------- | ------------------------- | ------- | ---------------- |
| `element` | `EventTarget`             | -       | Target element   |
| `event`   | `string`                  | -       | Event name       |
| `handler` | `Function`                | -       | Event handler    |
| `options` | `AddEventListenerOptions` | -       | Listener options |

### `off(element, event, handler, options?)`

Remove event listener.

### `sleep(ms)` / `sleepSync(ms)`

Async/sync delay helpers.

| Parameter | Type     | Default | Description           |
| --------- | -------- | ------- | --------------------- |
| `ms`      | `number` | -       | Delay in milliseconds |

### `defer(fn)`

Execute a function on the next microtask.

| Parameter | Type         | Default | Description       |
| --------- | ------------ | ------- | ----------------- |
| `fn`      | `() => void` | -       | Function to defer |
