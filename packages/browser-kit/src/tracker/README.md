# Tracker

> Send analytics events with batching, retry, offline handling, and page error capture.

English | [简体中文](./README.CN.md)

## Overview

The tracker sends events to one endpoint. Pending events are stored in localStorage by default and restored when a tracker is created again. Events are sent one at a time in enqueue order unless you add the batch plugin.

A tracker can use these plugins:

- Batch events before sending.
- Pause while the browser is offline.
- Report uncaught errors and unhandled promise rejections.
- Flush pending events when the page is hidden or about to close.

The core tries `navigator.sendBeacon()` first and falls back to `fetch()` with `keepalive: true`. A `true` result from `sendBeacon()` means the browser accepted the data. It does not mean the server received it.

## Core

### `defineTracker(options)`

| Option               | Type                                      | Default           | Description                                                                                            |
| -------------------- | ----------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| `url`                | `string`                                  | -                 | Tracking endpoint URL.                                                                                 |
| `transform`          | `(data: object) => object`                | Identity function | Transform each event before it is serialized and measured.                                             |
| `transport`          | `(item: object) => Promise<void> \| void` | Beacon adapter    | Replace the single-event delivery path. The event is removed only after the returned promise resolves. |
| `disablePersistence` | `boolean`                                 | `false`           | Do not read or write the localStorage snapshot.                                                        |
| `persistenceKey`     | `string`                                  | `url` value       | Stable localStorage key. Independent trackers must use different keys.                                 |

```ts
import { defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/track',
  transform: data => ({ ...data, source: 'web' })
}).make()

tracker.track({ event: 'page_view', path: '/' })
```

The instance provides these methods.

| Method        | Description                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `track(data)` | Add one event and start sending unless the tracker is paused or blocked by a persistence failure.                           |
| `pause()`     | Stop sending. New events stay in the pending snapshot.                                                                      |
| `resume()`    | Remove the pause or failure block and retry retained events.                                                                |
| `flush()`     | Send events that are not already in flight. It ignores pause and per-item failures, and it does not clear the paused state. |

Events stay in localStorage until the browser accepts them. If both `sendBeacon()` and the fallback request fail, the event remains pending. `flush()` retries pending and failed events in its call-time snapshot and does not restart events that are already in flight.

Other retries happen when you call `resume()`, when the browser fires `online` with `defineOfflineRestore()` installed, or when a later tracker instance starts.

`persistenceKey` defaults to `url`. Two independent trackers on the same page must use different stable keys. If localStorage is restricted, full, or unavailable, the tracker warns once, stops using persistence, and continues in memory. A stale snapshot can cause duplicate events on a later start.

When a tracker includes a listener plugin, `stop()` releases the listeners. It does not pause, clear, or flush pending events. Call it when the instance is no longer needed.

## Plugins

### `defineBatchTrack(options?)`

Collect events and send them as an array after a delay.

| Option              | Type     | Default | Description                                          |
| ------------------- | -------- | ------- | ---------------------------------------------------- |
| `defaultBatchDelay` | `number` | `500`   | Default batch delay in milliseconds.                 |
| `maxBatchKB`        | `number` | `64`    | Maximum batch size in KB before recursive splitting. |

The composed `track(data, batchDelay?)` accepts a per-call delay. Pass `0` or a negative value to send that event without batching. Batches larger than `maxBatchKB` are split. A single oversized event stays in one piece so its data shape does not change.

```ts
import { defineBatchTrack, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(defineBatchTrack({ defaultBatchDelay: 1_000 }))
  .make()

tracker.track({ event: 'click', target: 'button' })
tracker.track({ event: 'scroll', position: 100 }, 0)
```

### `defineOfflineRestore()`

Pause while the browser is offline, including when the tracker starts offline, and resume after the `online` event. It does not change persistence. Use `disablePersistence` on the core tracker for that.

### `definePageErrors(options?)`

Collect uncaught errors and unhandled promise rejections, then send them through the composed `track()`. It does not collect resource load failures, console messages, or framework callback errors.

| Option             | Type                       | Default     | Description                                                           |
| ------------------ | -------------------------- | ----------- | --------------------------------------------------------------------- |
| `maxErrors`        | `number`                   | `20`        | Maximum events reported by one plugin instance.                       |
| `dedupeWindowMs`   | `number`                   | `5000`      | Deduplication window for an error signature. `0` or less disables it. |
| `maxMessageLength` | `number`                   | `1000`      | Maximum reported message length.                                      |
| `maxStackLength`   | `number`                   | `8000`      | Maximum reported stack length.                                        |
| `metadata`         | `object \| (() => object)` | `undefined` | Per-report context. It cannot override standard event fields.         |

The payload looks like this:

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

Messages and stacks are truncated by default but are not scrubbed for personal data. If the metadata callback throws or returns a non-object, the metadata is omitted and the error is still reported.

`make()` installs the listeners. `stop()` removes them and cannot restart collection. Do not install this plugin more than once on the same page, because each installation adds separate listeners and counters.

```ts
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({ url: '/api/track' })
  .use(definePageErrors({ metadata: { app: 'demo' } }))
  .make()

tracker.stop()
```

### `defineLastWords()`

Call the composed `flush()` on `beforeunload`, `pagehide`, and when `visibilitychange` hides the document. The flush returns a promise, but the page exit path is best-effort. It does not wait for a server response, and a persistence error does not block the page from closing.

## Recommended setup

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
