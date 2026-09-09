# @greypan/js-kit

> JavaScript utility functions with composable plugin system

English | [简体中文](./README.CN.md)

## Features

- **Plugin system**: Composable plugins with `definePlugin`, chainable `.use()` and `.make()`
- **URL**: Parse and stringify URLs with query params and hash
- **Number**: Precision rounding and range clamping
- **Timer**: Debounce with leading/trailing/both timing, controllable interval with pause/resume
- **Shortcut**: Fire-and-forget `safeCall` wrapper
- **Paradigm**: Rust-style `Result` type utilities

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

### `defineBatchEmitter<S>(options?)`

Batched event emitter. Collects events and flushes them as a batch after a delay.

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
await ctx.batchEmit({ id: 1 })
await ctx.batchEmit({ id: 2 })
```

### `defineQueue<T>(options)`

A “delivery-is-consumption” queue. It removes an item immediately after calling `onConsume` and does not await a returned Promise, making it suitable for fire-and-forget work.

### `defineAckQueue<T>(options)`

A consumer-acknowledged queue. It removes an item only after the Promise returned by `onConsume` fulfills; a rejection affects only the current item, and failed items can be retried with `resume()` or `flush()`.

Both queues expose `enqueue()`, `pause()`, `resume()`, and asynchronous `flush()`, and support `initialItems`, synchronous `onPersist` snapshot persistence, and `onConsumeError`. See [`src/plugin-system/README.md`](./src/plugin-system/README.md) for the full option table, flush and persist-before-commit semantics, and the circular-wait constraint on calling `flush()` from a consumer.

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

Full `URLObject` shape, relative-path behavior, and examples: see [`src/url/README.md`](./src/url/README.md).

### `clamp(val, min, max)`

Clamp a number to a range. Automatically swaps min/max if inverted.

| Parameter | Type     | Default | Description    |
| --------- | -------- | ------- | -------------- |
| `val`     | `number` | -       | Value to clamp |
| `min`     | `number` | -       | Minimum value  |
| `max`     | `number` | -       | Maximum value  |

### `getFileExtension(filename)`

Extract file extension from filename. Throws when the input is empty or has no extension.

| Parameter  | Type     | Default | Description     |
| ---------- | -------- | ------- | --------------- |
| `filename` | `string` | -       | Filename string |

### `formatFileSize(bytes, decimals?)`

Format byte count to a human-readable string, e.g. `'1.23 KB'`.

| Parameter  | Type     | Default | Description    |
| ---------- | -------- | ------- | -------------- |
| `bytes`    | `number` | -       | Byte count     |
| `decimals` | `number` | `2`     | Decimal places |

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

### `safeCall(fn, options?)`

Fire-and-forget wrapper. Catches sync exceptions and async rejections; silently by default, or forwards them to `options.onError` when provided. `onError` failures are swallowed too — the call stays fire-and-forget.

| Parameter | Type                                 | Default | Description           |
| --------- | ------------------------------------ | ------- | --------------------- |
| `fn`      | `() => unknown`                      | -       | Thunk to call         |
| `options` | `{ onError?: (e: unknown) => void }` | -       | Optional error outlet |

### `rust`

Result type namespace for Rust-style error handling.

| Method           | Description                    |
| ---------------- | ------------------------------ |
| `ok(value)`      | Create success result          |
| `err(error)`     | Create error result            |
| `isOk(result)`   | Check if result is success     |
| `isErr(result)`  | Check if result is error       |
| `to(fn)`         | Wrap function to return Result |
| `unwrap(result)` | Extract value or throw error   |

**Import path:**

```ts
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
