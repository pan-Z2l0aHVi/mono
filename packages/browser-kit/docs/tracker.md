---
title: Tracker
---

# Tracker

`defineTracker` provides a composable telemetry outbox backed by `localStorage` persistence and `navigator.sendBeacon()` (with `fetch(..., { keepalive: true })` fallback). Add only the plugins you need: batching, offline pause/resume, exit flush, and page error collection.

## Composing plugins with custom transport

Supply a custom `transport` to test or route payloads through your own client, and pass `persistenceKey` to isolate multiple trackers on the same origin. Call `stop()` during teardown to detach global listeners.

```ts demo=tracker-playground
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent: object[] = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

tracker.track({ event: 'page_view', path: '/docs' })
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()
tracker.stop()

console.log(sent.length)
```

```js
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'

const sent = []

const tracker = defineTracker({
  url: '/api/track',
  persistenceKey: 'demo-session',
  transport: async payload => {
    sent.push(payload)
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 500, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 5_000 }))
  .make()

tracker.track({ event: 'page_view', path: '/docs' })
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()
tracker.stop()

console.log(sent.length)
```

## Plugins

| Plugin                       | Purpose                                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `defineTracker(options)`     | Core outbox, `localStorage` persistence, `beaconTransport` default, `pause()` / `resume()` / `flush()` |
| `defineBatchTrack(options?)` | Coalesce events within `defaultBatchDelay` and recursively split batches exceeding `maxBatchKB`        |
| `defineOfflineRestore()`     | Automatically `pause()` on `offline` and `resume()` on `online`                                        |
| `defineLastWords()`          | Best-effort `flush()` on `beforeunload`, `pagehide`, and `visibilitychange` (`hidden`)                 |
| `definePageErrors(options?)` | Capture uncaught `error` and `unhandledrejection` with dedupe window and error cap                     |
