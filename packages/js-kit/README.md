# @greypan/js-kit

> JavaScript utilities and composable plugins. Works in browsers, Node.js, and workers.

English | [简体中文](./README.CN.md)

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

## Quick start

```ts
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()

app.log('hello')
console.log(app.token)
```

## What you get

- Composable plugins built with `definePlugin`, `.use()`, and `.make()`.
- URL parsing and building with query parameters and hash.
- Number and string helpers for file sizes, ranges, and extensions.
- Debounce and a controllable interval timer.
- A `safeCall` wrapper for fire-and-forget work.
- Result values for error handling without exceptions.
- Shared TypeScript utility types.

## Plugins

### `definePlugin(setup)`

Create a plugin. Call `.use()` to combine it with other plugins, then `.make()` to create the instance.

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () => definePlugin(() => ({ apiUrl: 'https://api.example.com' }))
const config = defineConfig().make()

console.log(config.apiUrl)
```

| Parameter | Type            | Description                                      |
| --------- | --------------- | ------------------------------------------------ |
| `setup`   | `(ctx: D) => C` | Receives the shared context and returns the API. |

### `defineBatchEmitter<S>(options?)`

Collect events and deliver them as one batch after a delay.

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
await ctx.batchEmit({ id: 1 })
await ctx.batchEmit({ id: 2 })
```

`batchEmit(data, delay = 0)` resolves with the flushed batch. A delay of `0` or less delivers `[data]` immediately. A positive delay collects events until the timer fires. `flush()` delivers the current queue immediately.

| Option              | Type                                    | Default | Description                    |
| ------------------- | --------------------------------------- | ------- | ------------------------------ |
| `options.onFlushed` | `(items: S[]) => void \| Promise<void>` | -       | Called with each flushed batch |

### `defineQueue<T>(options)`

A queue for fire-and-forget work. It removes an item as soon as it calls `onConsume` and does not wait for a returned promise.

### `defineAckQueue<T>(options)`

A queue that waits for the consumer. It removes an item only after the promise returned by `onConsume` resolves. A rejection affects only that item, and `resume()` or `flush()` can retry failed items.

Both queues expose `enqueue()`, `pause()`, `resume()`, and asynchronous `flush()`. They also accept `initialItems`, a synchronous `onPersist` callback for snapshots, and `onConsumeError`.

See [`src/plugin-system/README.md`](./src/plugin-system/README.md) for the option table, persistence behavior, and the rule against calling `flush()` from inside a consumer.

## URL

### `parseUrl(url?)`

Parse a URL string into `base`, `query`, and `hash`. Relative and protocol-relative URLs are supported.

| Parameter | Type     | Default | Description         |
| --------- | -------- | ------- | ------------------- |
| `url`     | `string` | `''`    | URL string to parse |

### `stringifyUrl(opts, omitNil?)`

Build a URL string from `base`, `query`, and `hash`.

| Parameter | Type                 | Default | Description                             |
| --------- | -------------------- | ------- | --------------------------------------- |
| `opts`    | `Partial<URLObject>` | -       | URL components: `base`, `query`, `hash` |
| `omitNil` | `boolean`            | `true`  | Remove nil values from the query        |

See [`src/url/README.md`](./src/url/README.md) for examples and edge cases.

## Number and string helpers

### `clamp(val, min, max)`

Clamp a number to a range. Swaps `min` and `max` when they are reversed.

### `formatFileSize(bytes, decimals?)`

Format a byte count as a readable string, for example `'1.23 KB'`.

| Parameter  | Type     | Default | Description    |
| ---------- | -------- | ------- | -------------- |
| `bytes`    | `number` | -       | Byte count     |
| `decimals` | `number` | `2`     | Decimal places |

### `getFileExtension(filename)`

Return the extension of a filename. Throws when the input is empty or has no extension.

## Timers

### `defineControllableInterval(options)`

Create an interval that can be paused and resumed. The instance provides `start`, `pause`, `resume`, `stop`, and `tick`.

| Method        | Description                                                                         |
| ------------- | ----------------------------------------------------------------------------------- |
| `start()`     | Start the interval. A paused timer must be resumed instead.                         |
| `pause()`     | Pause and keep the remaining time of the current cycle.                             |
| `resume()`    | Continue from the remaining time instead of restarting the cycle.                   |
| `stop()`      | Cancel the interval and reset its state.                                            |
| `tick(delay)` | Run one extra callback after `delay` milliseconds without changing the pause state. |

```ts
const timer = defineControllableInterval({ callback: () => console.log('tick'), interval: 1000 }).make()
timer.start()
```

### `debounce(func, options?)`

Debounce a function. Returns `call`, `cancel`, `flush`, `isPending`, and `cachedValue`.

| Parameter | Type                                                                                  | Default | Description          |
| --------- | ------------------------------------------------------------------------------------- | ------- | -------------------- |
| `func`    | `Function`                                                                            | -       | Function to debounce |
| `options` | `{ timing?: 'trailing' \| 'leading' \| 'both'; waitMs?: number; maxWaitMs?: number }` | -       | Debounce options     |

`maxWaitMs` cannot be smaller than `waitMs`. A `leading` debounce does not accept `maxWaitMs`.

## Error handling

### `safeCall(fn, options?)`

Run a function without handling its errors at the call site. Synchronous throws and rejected promises are swallowed by default. Pass `onError` to receive them.

| Parameter | Type                                 | Default | Description           |
| --------- | ------------------------------------ | ------- | --------------------- |
| `fn`      | `() => unknown`                      | -       | Function to call      |
| `options` | `{ onError?: (e: unknown) => void }` | -       | Optional error outlet |

### `rust`

Result helpers for error handling without exceptions.

| Method           | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `ok(value)`      | Create a success result.                                        |
| `err(error)`     | Create an error result.                                         |
| `isOk(result)`   | Check for a success result.                                     |
| `isErr(result)`  | Check for an error result.                                      |
| `to(promise)`    | Resolve a promise into `Ok`, or capture a rejection as `Err`.   |
| `unwrap(result)` | Return the success value or the error payload. It never throws. |

```ts
import { rust } from '@greypan/js-kit/rust'
// Also available from '@greypan/js-kit'

const result = await rust.to(fetch('/api/user'))
if (rust.isOk(result)) console.log(result.value)
else console.error(rust.unwrap(result))
```

## Type utilities

| Type                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `ValueOf<T>`            | Union of all value types in an object.           |
| `ArrayItem<T>`          | Element type of an array.                        |
| `ArgumentType<T>`       | Union of a function's parameter types.           |
| `DeepPartial<T>`        | Recursive partial.                               |
| `DeepRequired<T>`       | Recursive required.                              |
| `ClassPropertyTypes<T>` | Types of a class's properties.                   |
| `Equal<X, Y>`           | Type equality check.                             |
| `PluginMade<T>`         | Instantiated type of a plugin factory or plugin. |
