# Plugin System

Composable plugin system for JavaScript utilities

English | [简体中文](./README.CN.md)

## Overview

The plugin system provides a functional approach to building composable, reusable modules. Instead of inheritance or classes, you compose functionality through plugins that can be chained with `.use()` and instantiated with `.make()`.

## Core

### `definePlugin<C, D>(setup)`

Create a composable plugin. The `setup` function receives a context object and returns the plugin's API.

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () =>
  definePlugin(() => ({
    apiUrl: 'https://api.example.com',
    timeout: 5000
  }))

// Instantiate with .make()
const config = defineConfig().make()
console.log(config.apiUrl) // 'https://api.example.com'
```

### `plugin.use(otherPlugin)`

Chain plugins together. The resulting plugin combines APIs from both.

```ts
const defineLogger = () => definePlugin(() => ({ log: (msg: string) => console.log(msg) }))

const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

// Compose: resulting plugin has both log and token
const app = defineLogger().use(defineAuth()).make()
app.log('hello')
console.log(app.token)
```

**Multi-level nesting:** `.use()` accepts any plugin — including one that is itself a `.use()` chain. All APIs merge into the final instance.

```ts
const defineA = () => definePlugin(() => ({ a: 1 }))
const defineB = () => definePlugin(() => ({ b: 2 }))
const defineC = () => definePlugin(() => ({ c: 3 }))
const defineD = () => definePlugin(() => ({ d: 4 }))

// .use() argument can be a chained plugin expression
const app = defineA().use(defineB().use(defineC())).use(defineD()).make()
console.log(app.a, app.b, app.c, app.d) // 1, 2, 3, 4
```

### `plugin.make(ctx?)`

Instantiate the plugin chain. Optionally pass initial context that will be merged.

```ts
const defineDb = () =>
  definePlugin((ctx: { connectionString: string }) => ({
    query: (sql: string) => ctx.connectionString + sql
  }))

const db = defineDb().make({ connectionString: 'postgres://...' })
db.query('SELECT 1')
```

## Plugins

### `defineEventEmitter<E>(options?)`

Type-safe event emitter with `on`, `off`, `emit` methods.

```ts
import { defineEventEmitter } from '@greypan/js-kit'

const emitter = defineEventEmitter<{
  data: [payload: { id: number }]
  error: [err: Error]
}>()

const ctx = emitter.make()
ctx.on('data', payload => console.log(payload.id))
ctx.emit('data', { id: 1 })
ctx.off('data', handler)
```

### `defineBatchEmitter<S>(options?)`

Batched event emitter. Collects events and flushes them as a batch after a delay.

| Parameter           | Type                   | Default | Description                    |
| ------------------- | ---------------------- | ------- | ------------------------------ |
| `options.onFlushed` | `(items: S[]) => void` | -       | Callback when batch is flushed |

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
ctx.emit({ id: 1 })
ctx.emit({ id: 2 })
// After batchDelay ms, onFlushed is called with [{ id: 1 }, { id: 2 }]
```

### `defineQueue<T>(options)`

A “delivery-is-consumption” queue. An item is removed immediately after `onConsume` is called; the queue does not await a returned Promise. It is suitable for fire-and-forget work. Synchronous throws and asynchronous rejections are reported to the optional `onConsumeError`, but the item is not re-enqueued.

### `defineAckQueue<T>(options)`

A consumer-acknowledged queue. An item is removed only after the Promise returned by `onConsume` fulfills. A rejection marks only that item as failed, so later items continue processing. `resume()` or `flush()` can retry failed items.

Both queues are instantiated with `.make()` and share these options:

| Option           | Type                                     | Default | Description                                                          |
| ---------------- | ---------------------------------------- | ------- | -------------------------------------------------------------------- |
| `onConsume`      | `(item: T) => void \| PromiseLike<void>` | -       | Required consumer for each queue item                                |
| `initialItems`   | `readonly T[]`                           | `[]`    | Items restored at creation; consumption starts in the next microtask |
| `onPersist`      | `(items: readonly T[]) => void`          | -       | Optional synchronous persistence seam receiving a shallow snapshot   |
| `onConsumeError` | `(error: unknown, item: T) => unknown`   | -       | Optional error observer; errors from the observer are ignored        |

A queue instance exposes `enqueue(item)`, `pause()`, `resume()`, and `flush(): Promise<void>`. The normal drain is strictly serial. `flush()` concurrently starts items that are pending or failed at call time and waits for the operations included in that call. It bypasses pause without clearing it; items enqueued after the call are outside that flush boundary.

When `onPersist` is provided, the queue uses persist-before-commit: a persistence failure preserves the previous membership and stops new consumption. `enqueue()` throws synchronously and `flush()` rejects. `resume()` probes the current snapshot before clearing this queue-global block. `onPersist` must complete synchronously; although TypeScript's `void` callback type may accept an async function, the runtime rejects a thenable and enters the persistence-blocked state.

Consumers may return Promises, but must not call the same queue's `flush()` from an asynchronous continuation of that consumer. `flush()` waits for in-flight consumers while that consumer would be waiting for `flush()`, creating a circular wait. Trigger `flush()` outside the consumer; a synchronous self-`flush()` is rejected immediately.

```ts
import { defineAckQueue } from '@greypan/js-kit'

const queue = defineAckQueue<string>({
  initialItems: ['restored-task'],
  onConsume: async item => {
    await sendTask(item)
  },
  onPersist: items => {
    savePendingItems(items)
  },
  onConsumeError: (error, item) => {
    console.warn('Task failed:', item, error)
  }
}).make()

queue.enqueue('task-1')
await queue.flush()
```

Use `defineQueue` when consumer Promise fulfillment is not part of the removal boundary. Use `defineAckQueue` when it is. “Acknowledgement” here means consumer-level success; it does not promise exactly-once processing or a server acknowledgement.

## Type Utilities

### `PluginMade<T>`

Extract the instantiated type from a plugin factory or plugin instance.

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin> // { apiUrl: string; timeout: number }
```
