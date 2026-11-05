# Plugin system

> Compose small JavaScript modules with `definePlugin`, `.use()`, and `.make()`.

English | [简体中文](./README.CN.md)

## Overview

A plugin is a function that returns an API object. You can combine plugins and create the final instance when you need it. This keeps shared state explicit and avoids class hierarchies.

## Core

### `definePlugin<C, D>(setup)`

Create a plugin. `setup` receives the shared context and returns the plugin API.

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () =>
  definePlugin(() => ({
    apiUrl: 'https://api.example.com',
    timeout: 5000
  }))

const config = defineConfig().make()
console.log(config.apiUrl)
```

### `plugin.use(otherPlugin)`

Combine two plugins. The resulting plugin exposes both APIs.

```ts
const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()
app.log('hello')
console.log(app.token)
```

`.use()` accepts another plugin chain, so you can build nested groups.

```ts
const defineA = () => definePlugin(() => ({ a: 1 }))
const defineB = () => definePlugin(() => ({ b: 2 }))
const defineC = () => definePlugin(() => ({ c: 3 }))

const app = defineA().use(defineB().use(defineC())).make()
console.log(app.a, app.b, app.c)
```

### `plugin.make(ctx?)`

Create the instance. You can pass initial context values.

```ts
const defineDb = () =>
  definePlugin((ctx: { connectionString: string }) => ({
    query: (sql: string) => ctx.connectionString + sql
  }))

const db = defineDb().make({ connectionString: 'postgres://...' })
db.query('SELECT 1')
```

## Batched events

### `defineBatchEmitter<S>(options?)`

Collect events and deliver them as one batch after a delay.

| Option              | Type                                    | Default | Description                    |
| ------------------- | --------------------------------------- | ------- | ------------------------------ |
| `options.onFlushed` | `(items: S[]) => void \| Promise<void>` | -       | Called with each flushed batch |

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
await Promise.all([ctx.batchEmit({ id: 1 }, 100), ctx.batchEmit({ id: 2 }, 100)])
// onFlushed receives [{ id: 1 }, { id: 2 }]
```

## Queues

### `defineQueue<T>(options)`

Remove each item as soon as it is passed to `onConsume`. The queue does not wait for a returned promise. Use it for work that does not need confirmation. Errors go to `onConsumeError`, and the item is not put back.

### `defineAckQueue<T>(options)`

Remove an item only after the promise returned by `onConsume` resolves. A rejection marks that item as failed and later items continue. `resume()` or `flush()` can retry failed items.

Both queues share these options.

| Option           | Type                                     | Default | Description                                                        |
| ---------------- | ---------------------------------------- | ------- | ------------------------------------------------------------------ |
| `onConsume`      | `(item: T) => void \| PromiseLike<void>` | -       | Required consumer for each item.                                   |
| `initialItems`   | `readonly T[]`                           | `[]`    | Items added at creation. Consumption starts in the next microtask. |
| `onPersist`      | `(items: readonly T[]) => void`          | -       | Receives a snapshot of pending items. It must run synchronously.   |
| `onConsumeError` | `(error: unknown, item: T) => unknown`   | -       | Optional error observer. Errors from the observer are ignored.     |

A queue instance exposes `enqueue(item)`, `pause()`, `resume()`, and `flush(): Promise<void>`. Normal consumption is serial. `flush()` starts pending and failed items that exist at call time, waits for that work, and does not clear the paused state. Items added after the call are outside that flush.

When `onPersist` fails, the queue keeps its previous items and stops consuming. `enqueue()` throws and `flush()` rejects. `resume()` retries after checking the current snapshot. An async `onPersist` is rejected at runtime.

Do not call the same queue's `flush()` from inside an asynchronous consumer. `flush()` waits for in-flight consumers, so the consumer and the flush would wait for each other. Call `flush()` from outside the consumer.

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

Use `defineQueue` when you do not need the consumer result. Use `defineAckQueue` when success determines whether the item is removed. Here, acknowledgement means the consumer completed. It does not promise exactly-once processing or a server response.

## Type utilities

### `PluginMade<T>`

Extract the instance type from a plugin factory or plugin.

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin>
```
