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

const withConfig = definePlugin(() => ({
  apiUrl: 'https://api.example.com',
  timeout: 5000
}))

// Instantiate with .make()
const config = withConfig.make()
console.log(config.apiUrl) // 'https://api.example.com'
```

### `plugin.use(otherPlugin)`

Chain plugins together. The resulting plugin combines APIs from both.

```ts
const withLogger = definePlugin(() => ({
  log: (msg: string) => console.log(msg)
}))

const withAuth = definePlugin(() => ({
  token: 'xxx'
}))

// Compose: resulting plugin has both log and token
const app = withLogger.use(withAuth).make()
app.log('hello')
console.log(app.token)
```

**Multi-level nesting:** `.use()` accepts any plugin — including one that is itself a `.use()` chain. All APIs merge into the final instance.

```ts
const withA = definePlugin(() => ({ a: 1 }))
const withB = definePlugin(() => ({ b: 2 }))
const withC = definePlugin(() => ({ c: 3 }))
const withD = definePlugin(() => ({ d: 4 }))

// .use() argument can be a chained plugin expression
const app = withA.use(withB.use(withC)).use(withD).make()
console.log(app.a, app.b, app.c, app.d) // 1, 2, 3, 4
```

### `plugin.make(ctx?)`

Instantiate the plugin chain. Optionally pass initial context that will be merged.

```ts
const withDb = definePlugin((ctx: { connectionString: string }) => ({
  query: (sql: string) => ctx.connectionString + sql
}))

const db = withDb.make({ connectionString: 'postgres://...' })
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

### `defineLoopQueue<T>(options)`

Async queue that processes items sequentially with auto-consume.

| Parameter              | Type                         | Default | Description                 |
| ---------------------- | ---------------------------- | ------- | --------------------------- |
| `options.onConsume`    | `(item: T) => Promise<void>` | -       | Handler for each queue item |
| `options.initialQueue` | `T[]`                        | `[]`    | Initial queue items         |

```ts
import { defineLoopQueue } from '@greypan/js-kit'

const queue = defineLoopQueue<string>({
  onConsume: async item => {
    console.log('Processing:', item)
  }
})

const ctx = queue.make()
ctx.push('task-1')
ctx.push('task-2')
ctx.pause() // Pause processing
ctx.resume() // Resume processing
ctx.flush() // Process all remaining items immediately
```

## Type Utilities

### `PluginMade<T>`

Extract the instantiated type from a plugin factory or plugin instance.

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin> // { apiUrl: string; timeout: number }
```
