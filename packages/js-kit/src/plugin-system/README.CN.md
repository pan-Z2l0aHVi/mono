# 插件系统

> 用 `definePlugin`、`.use()` 和 `.make()` 组合小型 JavaScript 模块。

[English](./README.md) | 简体中文

## 概述

插件是一个返回 API 对象的函数。你可以组合多个插件，在需要时创建最终实例。共享状态保持显式，不需要类继承。

## 核心

### `definePlugin<C, D>(setup)`

创建插件。`setup` 接收共享上下文并返回插件 API。

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

组合两个插件。结果插件同时提供两者的 API。

```ts
const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()
app.log('hello')
console.log(app.token)
```

`.use()` 可以接收另一条插件链，因此可以组合多层。

```ts
const defineA = () => definePlugin(() => ({ a: 1 }))
const defineB = () => definePlugin(() => ({ b: 2 }))
const defineC = () => definePlugin(() => ({ c: 3 }))

const app = defineA().use(defineB().use(defineC())).make()
console.log(app.a, app.b, app.c)
```

### `plugin.make(ctx?)`

创建实例。可以传入初始上下文。

```ts
const defineDb = () =>
  definePlugin((ctx: { connectionString: string }) => ({
    query: (sql: string) => ctx.connectionString + sql
  }))

const db = defineDb().make({ connectionString: 'postgres://...' })
db.query('SELECT 1')
```

## 批量事件

### `defineBatchEmitter<S>(options?)`

收集事件，并在延迟后以一批发送。

| 参数                | 类型                                    | 默认值 | 说明             |
| ------------------- | --------------------------------------- | ------ | ---------------- |
| `options.onFlushed` | `(items: S[]) => void \| Promise<void>` | -      | 每批发送时调用。 |

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
await Promise.all([ctx.batchEmit({ id: 1 }, 100), ctx.batchEmit({ id: 2 }, 100)])
// onFlushed 收到 [{ id: 1 }, { id: 2 }]
```

## 队列

### `defineQueue<T>(options)`

条目传给 `onConsume` 后立即移除，不等待返回的 Promise。适合不需要确认的任务。错误交给 `onConsumeError`，条目不会放回队列。

### `defineAckQueue<T>(options)`

`onConsume` 返回的 Promise resolve 后才移除条目。reject 只把当前条目标记为失败，后续条目继续处理。`resume()` 或 `flush()` 可以重试失败条目。

两种队列共享以下参数。

| 参数             | 类型                                     | 默认值 | 说明                                            |
| ---------------- | ---------------------------------------- | ------ | ----------------------------------------------- |
| `onConsume`      | `(item: T) => void \| PromiseLike<void>` | -      | 必填，每个条目的消费者。                        |
| `initialItems`   | `readonly T[]`                           | `[]`   | 创建时加入的条目，在下一个 microtask 开始消费。 |
| `onPersist`      | `(items: readonly T[]) => void`          | -      | 接收待处理条目的快照，必须同步执行。            |
| `onConsumeError` | `(error: unknown, item: T) => unknown`   | -      | 可选错误观察器，它自身抛出的错误会被忽略。      |

队列实例提供 `enqueue(item)`、`pause()`、`resume()` 和 `flush(): Promise<void>`。正常消费按顺序串行执行。`flush()` 会启动调用时已存在且待处理或失败的条目，等待本次工作完成，并且不会清除暂停状态。调用之后加入的条目不参与这次 flush。

`onPersist` 失败时，队列保留原来的条目并停止消费。`enqueue()` 抛错，`flush()` reject。`resume()` 会先检查当前快照再重试。异步 `onPersist` 会在运行时被拒绝。

不要在异步消费者内部调用同一个队列的 `flush()`。`flush()` 会等待在途消费者，消费者又在等待 `flush()`，两者会互相等待。请在消费者外部调用 `flush()`。

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

不需要等待消费者结果时用 `defineQueue`。成功结果决定条目是否移除时用 `defineAckQueue`。这里的「确认」只表示消费者完成，不承诺 exactly-once 处理或服务端响应。

## 类型工具

### `PluginMade<T>`

从插件工厂或插件中提取实例类型。

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin>
```
