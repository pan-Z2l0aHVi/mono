# Tracker

Data tracking and analytics with batch aggregation, page errors, offline restore, and last-words flush.

English | [简体中文](./README.CN.md)

## Overview

Tracker is a composable tracking system built on the plugin architecture. It maintains one pending transport outbox for data that the browser transport has not accepted yet.

- **Pending transport outbox**: Persists pending entries in localStorage by default and restores them when a Tracker is created again.
- **Ordered normal drain**: Regular `track()` calls send entries in enqueue order, one request at a time.
- **Batch aggregation**: Collects events and sends arrays after a configurable delay.
- **Beacon splitting**: Recursively splits oversized batches around the configured `maxBeaconSize` (64 KB by default).
- **Page errors**: Collects uncaught errors and unhandled promise rejections through the normal Tracker transport.
- **Offline restore**: Pauses while offline and resumes retained work after the browser comes back online.
- **Last-words flush**: Makes a best-effort flush when the page is leaving or hidden.
- **Auto-fallback**: Falls back from `sendBeacon()` to `fetch()` with `keepalive: true` when needed.

## Core plugin

### `defineTracker(options)`

| Option               | Type                                      | Default           | Description                                                                                                                                |
| -------------------- | ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `url`                | `string`                                  | -                 | Tracking endpoint URL                                                                                                                      |
| `transform`          | `(data: object) => object`                | Identity function | Transforms every event before serialization and byte-size calculation                                                                      |
| `transport`          | `(item: object) => Promise<void> \| void` | Beacon adapter    | Replaces the single-entry delivery path and receives the transformed payload; an entry is removed only after the returned Promise fulfills |
| `disablePersistence` | `boolean`                                 | `false`           | Disables reading and writing the localStorage pending transport outbox                                                                     |
| `persistenceKey`     | `string`                                  | `url` value       | Stable localStorage outbox key; independent Tracker instances must use different keys                                                      |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/track',
  transform: data => ({ ...data, source: 'web' })
}).make()

tracker.track({ event: 'page_view', path: '/' })
```

The resulting context exposes these methods:

| Method        | Description                                                                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `track(data)` | Enqueues one event and starts the normal drain unless the Tracker is paused or blocked by a persistence failure.                                             |
| `pause()`     | Stops the normal drain. Newly tracked data remains in the pending transport outbox.                                                                          |
| `resume()`    | Removes the paused/failure gate and schedules a retry of retained entries.                                                                                   |
| `flush()`     | Returns a Promise and best-effort sends call-time entries that are not already in flight. It bypasses pause and per-item failures, but does not clear pause. |

The core serializes the transformed event and tries `navigator.sendBeacon()` first. If the browser returns `false` or the call throws, it uses `fetch()` with `keepalive: true` as a fallback. A `true` return from `sendBeacon()` only means that the browser accepted the data for transmission, not that the server received it.

Entries remain in localStorage until the browser transport accepts them. If the Beacon path and the fallback request both fail, the entry remains pending. `flush()` also retries pending and failed entries in its call-time snapshot, without restarting entries that are already in flight. Automatic retry otherwise occurs through `resume()`, an `online` event when `defineOfflineRestore()` is installed, or a later Tracker instance. This is a browser-transport outbox, not a server-acknowledged delivery queue.

`persistenceKey` defaults to `url`. Independent Tracker instances in the same page must provide different stable keys; instances that reuse a key read and overwrite the same snapshot. If localStorage is restricted, full, or otherwise unavailable, the Tracker warns once, stops using persistence, and continues in memory-only mode. A stale snapshot may remain and cause at-least-once duplicates on a later initialization; this fallback does not provide exactly-once delivery.

## Plugins

### `defineBatchTrack(options?)`

Collects events and sends arrays after a delay.

| Option              | Type     | Default | Description                                         |
| ------------------- | -------- | ------- | --------------------------------------------------- |
| `defaultBatchDelay` | `number` | `500`   | Default batch delay in milliseconds                 |
| `maxBeaconSize`     | `number` | `64`    | Maximum batch size in KB before recursive splitting |

The composed `track(data, batchDelay?)` accepts an optional per-call delay. Pass `0` or a negative value to bypass batching for that event. Batches larger than `maxBeaconSize` are split recursively; a single oversized event remains one item so its schema is preserved.

```ts
import { defineBatchTrack, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack({ defaultBatchDelay: 1_000 }))
  .make()

tracker.track({ event: 'click', target: 'button' })
tracker.track({ event: 'scroll', position: 100 }, 0)
```

### `defineOfflineRestore()`

Pauses the Tracker while the browser is offline, including when the Tracker starts offline, and calls `resume()` after the `online` event. It does not change persistence: persistence belongs to the core Tracker and can be disabled with `disablePersistence`.

### `definePageErrors(options?)`

Collects browser-global uncaught errors and unhandled promise rejections, then sends them through the composed `track()`. It does not collect resource load failures, `console` messages, or framework callback errors.

| Option             | Type                       | Default     | Description                                                    |
| ------------------ | -------------------------- | ----------- | -------------------------------------------------------------- |
| `maxErrors`        | `number`                   | `20`        | Maximum number of events actually reported per plugin instance |
| `dedupeWindowMs`   | `number`                   | `5000`      | Deduplication window for an error signature; `≤ 0` disables it |
| `maxMessageLength` | `number`                   | `1000`      | Maximum length of the reported message                         |
| `maxStackLength`   | `number`                   | `8000`      | Maximum length of the reported stack                           |
| `metadata`         | `object \| (() => object)` | `undefined` | Per-report context; it cannot override standard event fields   |

The payload nests normalized error data and does not retain the original rejection reason:

```ts
{
  event: 'page_error',
  timestamp: 1760000000000,
  error: {
    category: 'uncaught', // or 'unhandled_rejection'
    message: 'boom',
    filename: '/assets/app.js',
    lineno: 12,
    colno: 34,
    stack: 'Error: boom\n    at ...'
  },
  metadata: { app: 'demo' }
}
```

Messages and stacks are truncated by default but are not automatically scrubbed for PII. If a metadata callback throws or returns a non-object, metadata is omitted and the error is still reported. `make()` installs the listeners; `stop()` removes them, does not restart collection, and does not reset protection counters.

Metadata is business-owned data: keep it bounded and serializable. Do not install this plugin more than once on the same page; each installation adds separate listeners and protection state.

```ts
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(definePageErrors({ metadata: { app: 'demo' } }))
  .make()

// Later, for HMR or test cleanup:
tracker.stop()
```

### `defineLastWords()`

Calls the composed `flush()` on `beforeunload`, `pagehide`, and when `visibilitychange` changes the document to hidden. The flush returns a Promise, but the exit path remains best-effort; it does not wait for server acknowledgement and persistence errors do not block page exit.

## Recommended composition

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
tracker.track({ event: 'click', target: 'signup' })
```
