---
title: Tracker
---

# Tracker

`defineTracker` builds a composable telemetry outbox backed by `localStorage` persistence and `beaconTransport`. Start with the core tracker, then attach only the plugins you need for batching, offline recovery, exit flushing, and page error reporting.

## How plugin composition works

`defineTracker` returns a plugin builder from `@greypan/js-kit`. Chain `.use()` calls to layer behavior on top of the core outbox, then call `.make()` to create the runtime instance.

Each plugin declares only the capabilities it needs (`track`, `flush`, `pause`, `resume`, `stop`), so **registration order matters**:

1. Start with `defineTracker(options)`. It provides core `track()`, `flush()`, `pause()`, `resume()`, and `localStorage` persistence.
2. Register `defineBatchTrack()` next if you want batching. It replaces `track()` and `flush()` so callers buffer events and `flush()` drains both the batch timer and the core outbox.
3. Register `defineOfflineRestore()`, `defineLastWords()`, and `definePageErrors()` after `defineBatchTrack()`. That way `defineLastWords()` flushes the batch buffer before the page unloads, and `definePageErrors()` sends captured errors through the batched `track()` method.
4. Call `tracker.stop()` during teardown. Every plugin that attaches global listeners composes its cleanup into `stop()`, regardless of plugin order.

## Recommended full setup

Pass a custom `transport` in tests or demos to intercept payloads in memory. Pass a distinct `persistenceKey` when two trackers run on the same origin so their `localStorage` keys (`tracker:queue:<persistenceKey>`) do not collide.

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

// Batched by default (500ms window)
tracker.track({ event: 'page_view', path: '/docs' })

// Pass batchDelay <= 0 to bypass the batch timer for an urgent event
tracker.track({ event: 'checkout_start' }, 0)

// Pause during offline periods and resume when back online
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// Detach all window and document listeners registered by plugins
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

// Batched by default (500ms window)
tracker.track({ event: 'page_view', path: '/docs' })

// Pass batchDelay <= 0 to bypass the batch timer for an urgent event
tracker.track({ event: 'checkout_start' }, 0)

// Pause during offline periods and resume when back online
tracker.pause()
tracker.track({ event: 'click', target: 'cta' })
await tracker.resume()
await tracker.flush()

// Detach all window and document listeners registered by plugins
tracker.stop()

console.log(sent.length)
```

## Minimal setup and custom transport

You do not have to attach all plugins. If you only need persisted delivery with a custom `fetch` client and dynamic error metadata, compose only what you use.

The outbox removes an entry only when `transport` resolves. Throwing or returning a rejected promise keeps the entry in the outbox for the next `resume()` or `flush()`.

```ts
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/events',
  persistenceKey: 'error-only',
  transform: data => ({ ...data, appVersion: '1.4.0' }),
  transport: async item => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  }
})
  .use(
    definePageErrors({
      maxErrors: 20,
      dedupeWindowMs: 5_000,
      metadata: () => ({ route: location.pathname })
    })
  )
  .make()

tracker.track({ event: 'boot' })
tracker.stop()
```

```js
import { definePageErrors, defineTracker } from '@greypan/browser-kit'

const tracker = defineTracker({
  url: '/api/events',
  persistenceKey: 'error-only',
  transform: data => ({ ...data, appVersion: '1.4.0' }),
  transport: async item => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(item)
    })
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
  }
})
  .use(
    definePageErrors({
      maxErrors: 20,
      dedupeWindowMs: 5_000,
      metadata: () => ({ route: location.pathname })
    })
  )
  .make()

tracker.track({ event: 'boot' })
tracker.stop()
```

## Plugin reference

### Core factory: defineTracker

Core outbox plugin. By default it persists queued items to `localStorage` under `tracker:queue:<persistenceKey>` and delivers each item with `beaconTransport`.

- **Default transport (`beaconTransport`).** Calls `navigator.sendBeacon(url, JSON.stringify(data))` first. If the browser rejects the beacon, it falls back to `fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors', body })`. Both send a string body as `text/plain` so cross-origin endpoints do not trigger a CORS preflight.
- **`transform` must be idempotent.** `defineBatchTrack` calls `transform` once while estimating byte size and `defineTracker` calls it again before sending. Avoid mutating input objects or generating fresh random IDs inside `transform`.
- **Restricted storage fallback.** If `localStorage` throws `SecurityError` or quota errors, the tracker switches to memory-only mode instead of failing `track()`.

| Option               | Type                                      | Default           | Description                                                    |
| -------------------- | ----------------------------------------- | ----------------- | -------------------------------------------------------------- |
| `url`                | `string`                                  | Required          | Collector endpoint URL used by `beaconTransport`               |
| `transform`          | `(data: object) => object`                | Identity          | Pure payload transform applied before size estimation and send |
| `transport`          | `(item: object) => Promise<void> \| void` | `beaconTransport` | Custom delivery function; reject to retain the item for retry  |
| `persistenceKey`     | `string`                                  | `options.url`     | Stable `localStorage` key suffix to isolate multiple trackers  |
| `disablePersistence` | `boolean`                                 | `false`           | Keep the outbox in memory only                                 |

### Batching plugin: defineBatchTrack

Aggregates calls to `track(data, batchDelay?)` into arrays and sends them as a single payload after `batchDelay` ms.

- Always sends an array (`object[]`) to the core tracker, even for a single item, so your collector receives one consistent shape.
- When a batch exceeds `maxBatchKB`, it splits the array in half recursively until each chunk fits. A single item larger than `maxBatchKB` is still sent as-is on a best-effort basis.
- Pass `batchDelay <= 0` on a specific `track(data, 0)` call to skip batching and send immediately.

| Option              | Type     | Default | Description                                                                         |
| ------------------- | -------- | ------- | ----------------------------------------------------------------------------------- |
| `defaultBatchDelay` | `number` | `500`   | Wait window in milliseconds before flushing a batch                                 |
| `maxBatchKB`        | `number` | `64`    | Target payload cap per chunk in KB (matches `sendBeacon` / `keepalive` 64 KB limit) |

### Offline restore plugin: defineOfflineRestore

Listens to `window` `offline` and `online` events. It pauses the outbox immediately if `navigator.onLine` is `false` at startup or when `offline` fires, and calls `resume()` when `online` fires. In SSR environments it becomes a no-op.

### Page exit flush plugin: defineLastWords

Listens to `beforeunload`, `pagehide`, and `document` `visibilitychange` (`hidden`) and triggers a best-effort `flush()` once per hide cycle. When the page becomes visible again, the guard resets so the next hide flushes again.

### Page error plugin: definePageErrors

Captures uncaught `window` `error` events and `unhandledrejection` events and forwards them through `ctx.track()`. It does not intercept resource load failures, `console.error`, or framework-handled errors.

| Option             | Type                       | Default     | Description                                                               |
| ------------------ | -------------------------- | ----------- | ------------------------------------------------------------------------- |
| `maxErrors`        | `number`                   | `20`        | Maximum errors reported during the page lifetime                          |
| `dedupeWindowMs`   | `number`                   | `5000`      | Suppress identical error signatures within this window (`<= 0` disables)  |
| `maxMessageLength` | `number`                   | `1000`      | Maximum character length for `error.message`                              |
| `maxStackLength`   | `number`                   | `8000`      | Maximum character length for `error.stack`                                |
| `metadata`         | `object \| (() => object)` | `undefined` | Extra context attached under `metadata`; never overwrites standard fields |

Reported error events use this shape:

```ts
type PageErrorPayload = {
  event: 'page_error'
  timestamp: number
  error: {
    category: 'uncaught' | 'unhandled_rejection'
    message: string
    filename?: string
    lineno?: number
    colno?: number
    stack?: string
  }
  metadata?: object
}
```
