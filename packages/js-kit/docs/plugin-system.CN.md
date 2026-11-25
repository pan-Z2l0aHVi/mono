# plugin-system

[English](./plugin-system.md) | 简体中文

可组合插件构建器（`definePlugin`），以及内置的批量事件发射插件（`defineBatchEmitter`）与可暂停队列插件（`defineQueue`、`defineAckQueue`）。

## 示例

### 使用 `definePlugin` 组合插件

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

### 使用 `defineBatchEmitter` 批量发射

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

### 使用 `defineQueue` 与 `defineAckQueue`

`defineQueue` 在调用 `onConsume` 时立即移除元素；`defineAckQueue` 仅在 `onConsume` 返回的 Promise resolve 后才移除元素，失败项会保留并在 `resume()` 或 `flush()` 时重试。切勿在 `onConsume` 内部调用 `flush()`。

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

| 导出                           | 说明                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| `definePlugin(setup)`          | 创建可组合插件，支持 `.use(other)` 链式合并与 `.make()` 实例化。                                  |
| `defineBatchEmitter(options?)` | 在延迟窗口内聚合事件并批量回调 `onFlushed`，支持手动 `flush()`。                                  |
| `defineQueue(options)`         | Fire-and-forget 队列，支持 `enqueue`、`pause`、`resume`、`flush`、`initialItems` 与 `onPersist`。 |
| `defineAckQueue(options)`      | 确认型队列，仅在 `onConsume` resolve 后出队，支持失败保留与重试。                                 |
