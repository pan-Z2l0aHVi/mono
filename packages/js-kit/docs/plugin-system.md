---
title: Plugin System
---

# Plugin System

`definePlugin` provides a typed, zero-dependency plugin builder used across `@greypan/js-kit` and `@greypan/browser-kit`. This module also includes three ready-to-use plugins built on top of it: `defineBatchEmitter`, `defineQueue`, and `defineAckQueue`.

## Composing plugins with `definePlugin`

Pass a setup function `(ctx) => exports` to `definePlugin`. Each `.use()` call merges the new plugin's exports onto the accumulated `ctx`, and `.make()` executes the chain once to return the final object.

- **Overriding methods.** If a later plugin returns a property with the same name as an earlier one, it overrides that property on the final instance while still able to call the previous implementation through `ctx`.
- **Typing the final instance.** Use `PluginMade<typeof defineMyPlugin>` to extract the concrete return type of a plugin factory.

```ts demo=plugin-compose
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: (msg: string) => `[log] ${msg}`
  }))

const defineAuth = () =>
  definePlugin((ctx: { log: (msg: string) => string }) => ({
    token: 'demo-token',
    authLog: (msg: string) => `${ctx.log(msg)} (token: demo-token)`
  }))

const app = defineLogger().use(defineAuth()).make()

console.log(app.authLog('request sent'))
```

```js
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: msg => `[log] ${msg}`
  }))

const defineAuth = () =>
  definePlugin(ctx => ({
    token: 'demo-token',
    authLog: msg => `${ctx.log(msg)} (token: demo-token)`
  }))

const app = defineLogger().use(defineAuth()).make()

console.log(app.authLog('request sent'))
```

## Batching calls with `defineBatchEmitter`

`defineBatchEmitter` collects items emitted via `batchEmit(item, delay)` and invokes `onFlushed(items)` once the delay window elapses. Call `flush()` to drain buffered items immediately.

```ts demo=batch-emitter
import { defineBatchEmitter } from '@greypan/js-kit'

const batches: string[][] = []
const emitter = defineBatchEmitter<string>({
  onFlushed: items => {
    batches.push(items)
  }
}).make()

void emitter.batchEmit('click', 200)
void emitter.batchEmit('scroll', 200)
emitter.flush()

console.log(batches)
```

```js
import { defineBatchEmitter } from '@greypan/js-kit'

const batches = []
const emitter = defineBatchEmitter({
  onFlushed: items => {
    batches.push(items)
  }
}).make()

void emitter.batchEmit('click', 200)
void emitter.batchEmit('scroll', 200)
emitter.flush()

console.log(batches)
```

## At-least-once delivery with `defineAckQueue`

`defineAckQueue` consumes items in FIFO order and removes the head item only after `onConsume` resolves. If `onConsume` throws or rejects, the item stays at the head of the queue so a later `resume()` or `flush()` can retry it.

Use `defineQueue` instead when you want fire-and-forget FIFO draining without retaining failed items.

```ts demo=ack-queue
import { defineAckQueue } from '@greypan/js-kit'

const delivered: string[] = []
const queue = defineAckQueue<string>({
  onConsume: async item => {
    delivered.push(item)
  }
}).make()

queue.pause()
await queue.enqueue('job-1')
await queue.enqueue('job-2')
await queue.resume()

console.log(delivered)
```

```js
import { defineAckQueue } from '@greypan/js-kit'

const delivered = []
const queue = defineAckQueue({
  onConsume: async item => {
    delivered.push(item)
  }
}).make()

queue.pause()
await queue.enqueue('job-1')
await queue.enqueue('job-2')
await queue.resume()

console.log(delivered)
```

## API

| Export                               | Description                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| `definePlugin(setup)`                | Create a composable plugin builder with `.use()` and `.make()`                    |
| `PluginMade<T>`                      | Utility type that extracts the instance type produced by a plugin factory         |
| `defineBatchEmitter({ onFlushed })`  | Coalesce calls over a delay window with `batchEmit(item, delay)` and `flush()`    |
| `defineQueue({ onConsume, ... })`    | FIFO queue with `enqueue`, `pause`, `resume`, `flush`, and optional persistence   |
| `defineAckQueue({ onConsume, ... })` | Acknowledged FIFO queue that retains items on `onConsume` rejection until retried |
