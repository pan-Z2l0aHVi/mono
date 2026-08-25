# @greypan/js-kit

> JavaScript utility functions with composable plugin system

English | [简体中文](./README.CN.md)

## Features

- **Plugin system**: Composable plugins with `definePlugin`, chainable `.use()` and `.make()`
- **URL**: Parse and stringify URLs with query params and hash
- **Number**: Precision rounding and range clamping
- **Random**: Integers, floats, RGB and hex color generation
- **Timer**: Debounce with leading/trailing/both timing, controllable interval with pause/resume
- **Fetch**: Async middleware composition with `asyncCompose`
- **Shortcut**: Fire-and-forget `safeCall` wrapper
- **Paradigms**: Go-style and Rust-style `Result` type utilities

## Install

```bash
# npm
npm install @greypan/js-kit

# pnpm
pnpm add @greypan/js-kit

# yarn
yarn add @greypan/js-kit

# bun
bun add @greypan/js-kit
```

## Quick Start

```ts
import { definePlugin } from '@greypan/js-kit'

// Define reusable plugins
const defineLogger = () => definePlugin(() => ({ log: (msg: string) => console.log(msg) }))

const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

// Compose plugins with .use() and instantiate with .make()
const app = defineLogger().use(defineAuth()).make()

app.log('hello') // 'hello'
console.log(app.token) // 'xxx'
```

## Plugins

### `definePlugin(setup)`

Core of the plugin system. Encapsulates functionality into composable plugins, chainable with `.use()`, instantiated with `.make()`. Plugins can register other plugins internally, and all APIs merge into the final instance.

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () => definePlugin(() => ({ apiUrl: 'https://api.example.com' }))

const ctx = defineConfig().make()
console.log(ctx.apiUrl) // 'https://api.example.com'
```

### `defineEventEmitter<E>(options?)`

Type-safe event emitter plugin with `on`, `off`, `emit` methods.

```ts
import { defineEventEmitter } from '@greypan/js-kit'

const emitter = defineEventEmitter<{
  data: [payload: { id: number }]
  error: [err: Error]
}>()

const ctx = emitter.make()
ctx.on('data', payload => console.log(payload.id))
ctx.emit('data', { id: 1 })
```

### `defineBatchEmitter<S>(options?)`

Batched event emitter. Collects events and flushes them as a batch after a delay.

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
ctx.emit({ id: 1 })
ctx.emit({ id: 2 })
```

### `defineQueue<T>(options)`

A “delivery-is-consumption” queue. It removes an item immediately after calling `onConsume` and does not await a returned Promise, making it suitable for fire-and-forget work. Consumer errors can be observed through `onConsumeError`, but an already delivered item is not retried automatically.

### `defineAckQueue<T>(options)`

A consumer-acknowledged queue. It removes an item only after the Promise returned by `onConsume` fulfills. A rejection affects only the current item; later items continue, and failed items can be retried with `resume()` or `flush()`.

Both queues expose `enqueue()`, `pause()`, `resume()`, and asynchronous `flush()`. They support `initialItems`, synchronous `onPersist` snapshot persistence, and `onConsumeError`. The normal drain is strictly serial; `flush()` concurrently starts pending/failed items from its call boundary without clearing pause or including items enqueued afterward. `onPersist` must complete synchronously; the runtime rejects a returned thenable to preserve persist-before-commit.

Consumers may return Promises, but must not call the same queue's `flush()` from an asynchronous continuation of that consumer. That would make `flush()` wait for the in-flight consumer while the consumer waits for `flush()`, creating a circular wait. Trigger `flush()` outside the consumer; synchronous self-`flush()` is rejected immediately.

```ts
import { defineAckQueue } from '@greypan/js-kit'

const queue = defineAckQueue<string>({
  onConsume: item => sendTask(item),
  onPersist: items => savePendingItems(items)
}).make()

queue.enqueue('task-1')
await queue.flush()
```

The “acknowledgement” in `defineAckQueue` is consumer Promise fulfillment, not server acknowledgement. Use `defineQueue` when delivery should remove the item immediately.

## API

### `definePlugin<C, D>(setup)`

Core plugin factory. Creates a plugin that can be composed with `.use()` and instantiated with `.make()`.

| Parameter | Type            | Default | Description                                                 |
| --------- | --------------- | ------- | ----------------------------------------------------------- |
| `setup`   | `(ctx: D) => C` | -       | Setup function that receives context and returns plugin API |

### `PluginMade<T>`

Type utility that extracts the instantiated type from a plugin factory or plugin instance.

### `parseUrl(url?)`

Parse a URL string into a structured object. Supports relative paths.

| Parameter | Type     | Default | Description         |
| --------- | -------- | ------- | ------------------- |
| `url`     | `string` | `''`    | URL string to parse |

### `stringifyUrl(opts, omitNil?)`

Build a URL string from structured components.

| Parameter | Type                 | Default | Description                             |
| --------- | -------------------- | ------- | --------------------------------------- |
| `opts`    | `Partial<URLObject>` | -       | URL components: `base`, `query`, `hash` |
| `omitNil` | `boolean`            | `true`  | Remove nil values from query            |

### `clamp(val, min, max)`

Clamp a number to a range. Automatically swaps min/max if inverted.

| Parameter | Type     | Default | Description    |
| --------- | -------- | ------- | -------------- |
| `val`     | `number` | -       | Value to clamp |
| `min`     | `number` | -       | Minimum value  |
| `max`     | `number` | -       | Maximum value  |

### `random(min, max)`

Generate a random integer in `[min, max]`.

| Parameter | Type     | Default | Description   |
| --------- | -------- | ------- | ------------- |
| `min`     | `number` | -       | Minimum value |
| `max`     | `number` | -       | Maximum value |

### `randomFloat(min, max)`

Generate a random float in `[min, max)`.

| Parameter | Type     | Default | Description   |
| --------- | -------- | ------- | ------------- |
| `min`     | `number` | -       | Minimum value |
| `max`     | `number` | -       | Maximum value |

### `randomRgb()`

Generate a random RGB color string, e.g. `rgb(255, 0, 0)`.

### `randomHex()`

Generate a random hex color string, e.g. `#ff0000`.

### `defineControllableInterval(options)`

Create a controllable interval with pause/resume support. Returns a plugin with `start`, `pause`, `resume`, `stop` methods.

| Parameter | Type                                         | Default | Description         |
| --------- | -------------------------------------------- | ------- | ------------------- |
| `options` | `{ callback: () => void; interval: number }` | -       | Timer configuration |

### `debounce(func, options?)`

Debounce a function with configurable timing mode.

| Parameter | Type                                                                                 | Default | Description          |
| --------- | ------------------------------------------------------------------------------------ | ------- | -------------------- |
| `func`    | `Function`                                                                           | -       | Function to debounce |
| `options` | `{ timing?: 'trailing' \| 'leading' \| 'both'; waitMs: number; maxWaitMs?: number }` | -       | Debounce options     |

### `safeCall(fn, ...args)`

Fire-and-forget wrapper. Catches sync exceptions and async rejections silently.

| Parameter | Type                   | Default | Description       |
| --------- | ---------------------- | ------- | ----------------- |
| `fn`      | `(...args) => unknown` | -       | Function to call  |
| `...args` | `Parameters<T>`        | -       | Arguments to pass |

### `asyncCompose(...fns)`

Compose async middleware functions into a single pipeline.

| Parameter | Type           | Default | Description                     |
| --------- | -------------- | ------- | ------------------------------- |
| `...fns`  | `Middleware[]` | -       | Middleware functions to compose |

### `go` / `rust`

Result type namespaces for Go-style and Rust-style error handling.

| Method           | Description                    |
| ---------------- | ------------------------------ |
| `ok(value)`      | Create success result          |
| `err(error)`     | Create error result            |
| `isOk(result)`   | Check if result is success     |
| `isErr(result)`  | Check if result is error       |
| `to(fn)`         | Wrap function to return Result |
| `unwrap(result)` | Extract value or throw error   |

**Import paths:**

```ts
import { go } from '@greypan/js-kit/go'
import { rust } from '@greypan/js-kit/rust'
```

### Type Utilities

| Type                    | Description                           |
| ----------------------- | ------------------------------------- |
| `ValueOf<T>`            | Union of all value types in an object |
| `ArrayItem<T>`          | Element type of an array              |
| `ArgumentType<T>`       | First argument type of a function     |
| `DeepPartial<T>`        | Recursive partial                     |
| `DeepRequired<T>`       | Recursive required                    |
| `ClassPropertyTypes<T>` | Class property types                  |
| `Equal<X, Y>`           | Type equality check                   |
