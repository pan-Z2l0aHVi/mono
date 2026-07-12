# Tracker

Data tracking and analytics with batch aggregation, offline restore, and last-words flush

English | [简体中文](./README.CN.md)

## Overview

A composable tracking system built on the plugin architecture. Features:

- **Batch aggregation**: Collects events and sends them in batches to reduce network requests
- **Beacon splitting**: Automatically splits data exceeding 64KB (sendBeacon limit) into multiple chunks
- **Offline restore**: Saves pending data to IndexedDB when offline, restores on reconnect
- **Last-words**: Flushes pending data immediately on page close or visibility change
- **Auto-fallback**: Falls back from sendBeacon to fetch keepalive on failure

## Plugins

### `defineTracker(options)`

Core tracking plugin. Sends data via `sendBeacon` with `fetch` fallback.

| Parameter            | Type      | Default | Description                         |
| -------------------- | --------- | ------- | ----------------------------------- |
| `options.endpoint`   | `string`  | -       | Tracking endpoint URL               |
| `options.sendBeacon` | `boolean` | `true`  | Use sendBeacon (false = fetch only) |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
const ctx = tracker.make()

ctx.send({ event: 'page_view', path: '/' })
```

### `defineBatchTrack(options?)`

Batch aggregation plugin. Collects events and sends them after a delay.

| Parameter            | Type     | Default | Description                      |
| -------------------- | -------- | ------- | -------------------------------- |
| `options.batchDelay` | `number` | `3000`  | Delay before flushing batch (ms) |

```ts
import { defineTracker, defineBatchTrack } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack({ batchDelay: 5000 }))
  .make()

// Events are batched and sent every 5 seconds
tracker.send({ event: 'click', target: 'button' })
tracker.send({ event: 'scroll', position: 100 })
```

### `defineLastWords()`

Last-words plugin. Flushes pending data on `beforeunload` and `visibilitychange`.

```ts
import { defineTracker, defineLastWords } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' }).use(defineLastWords()).make()
```

### `defineOfflineRestore()`

Offline restore plugin. Saves data to IndexedDB when offline and restores on reconnect.

```ts
import { defineTracker, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' }).use(defineOfflineRestore()).make()
```

## Full Composition

Combine all plugins for a complete tracking solution:

```ts
import { defineTracker, defineBatchTrack, defineLastWords, defineOfflineRestore } from '@greypan/browser-kit'

const tracker = defineTracker({ endpoint: '/api/track' })
  .use(defineBatchTrack())
  .use(defineLastWords())
  .use(defineOfflineRestore())
  .make()

// Use in your app
tracker.send({ event: 'page_view', path: '/' })
tracker.send({ event: 'click', target: 'signup' })
```

## Notes

1. **send** → Data is added to the batch queue
2. **batchDelay** → After delay, batch is flushed
3. **beacon split** → If data > 64KB, it's split into chunks using binary recursive splitting
4. **sendBeacon** → Primary transport via `navigator.sendBeacon`
5. **fetch fallback** → If sendBeacon fails, falls back to `fetch` with `keepalive: true`
6. **offline** → If network is unavailable, data is saved to IndexedDB
7. **reconnect** → Pending data is restored from IndexedDB and resent
8. **last-words** → On page close, pending data is flushed synchronously
