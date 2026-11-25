# plugin-system

English | [简体中文](./plugin-system.CN.md)

Composable plugin builder (`definePlugin`) plus built-in plugins for batched event emission (`defineBatchEmitter`) and pauseable queues (`defineQueue`, `defineAckQueue`).

## Examples

### Composable plugins with `definePlugin`

```ts demo=plugin-compose
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: (message: string) => `[log] ${message}`
  }))

const defineAuth = () =>
  definePlugin(() => ({
    token: 'demo-token'
  }))

const app = defineLogger().use(defineAuth()).make()
console.log(app.log(app.token))
```

```js
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () =>
  definePlugin(() => ({
    log: message => `[log] ${message}`
  }))

const defineAuth = () =>
  definePlugin(() => ({
    token: 'demo-token'
  }))

const app = defineLogger().use(defineAuth()).make()
console.log(app.log(app.token))
```

### Batched emission with `defineBatchEmitter`

```ts demo=batch-emitter
import { defineBatchEmitter } from '@greypan/js-kit'

const emitter = defineBatchEmitter<{ id: number }>({
  onFlushed: items => {
    console.log('Flushed batch:', items.length)
  }
}).make()

void emitter.batchEmit({ id: 1 }, 300)
void emitter.batchEmit({ id: 2 }, 300)
```

```js
import { defineBatchEmitter } from '@greypan/js-kit'

const emitter = defineBatchEmitter({
  onFlushed: items => {
    console.log('Flushed batch:', items.length)
  }
}).make()

void emitter.batchEmit({ id: 1 }, 300)
void emitter.batchEmit({ id: 2 }, 300)
```

### Queues with `defineQueue` and `defineAckQueue`

`defineQueue` removes an item as soon as `onConsume` is invoked. `defineAckQueue` waits for the returned promise to resolve; a rejected item stays queued for retry on `resume()` or `flush()`. Do not call `flush()` from inside `onConsume`.

```ts demo=ack-queue
import { defineAckQueue } from '@greypan/js-kit'

const queue = defineAckQueue<{ id: number }>({
  onConsume: async item => {
    console.log('Consumed item', item.id)
  },
  onConsumeError: (error, item) => {
    console.error('Failed item', item.id, error)
  }
}).make()

queue.enqueue({ id: 1 })
queue.pause()
queue.enqueue({ id: 2 })
queue.resume()
```

```js
import { defineAckQueue } from '@greypan/js-kit'

const queue = defineAckQueue({
  onConsume: async item => {
    console.log('Consumed item', item.id)
  },
  onConsumeError: (error, item) => {
    console.error('Failed item', item.id, error)
  }
}).make()

queue.enqueue({ id: 1 })
queue.pause()
queue.enqueue({ id: 2 })
queue.resume()
```

## API

| Export                         | Description                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `definePlugin(setup)`          | Creates a composable plugin with `.use(other)` and `.make()`.                                      |
| `defineBatchEmitter(options?)` | Collects events and delivers them as a batch after a delay or on `flush()`.                        |
| `defineQueue(options)`         | Fire-and-forget queue with `enqueue`, `pause`, `resume`, `flush`, `initialItems`, and `onPersist`. |
| `defineAckQueue(options)`      | Acknowledged queue that removes items only after `onConsume` resolves.                             |
