# 插件系统

基于可组合插件的 JavaScript 工具架构

[English](./README.md) | 简体中文

## 概述

插件系统提供了函数式的可组合、可复用模块构建方式。不使用继承或类，而是通过插件组合功能，支持 `.use()` 链式组合和 `.make()` 实例化。

## 核心

### `definePlugin<C, D>(setup)`

创建可组合插件。`setup` 函数接收上下文对象并返回插件 API。

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () =>
  definePlugin(() => ({
    apiUrl: 'https://api.example.com',
    timeout: 5000
  }))

// 通过 .make() 实例化
const config = defineConfig().make()
console.log(config.apiUrl) // 'https://api.example.com'
```

### `plugin.use(otherPlugin)`

链式组合插件。结果插件合并两者的 API。

```ts
const defineLogger = () => definePlugin(() => ({ log: (msg: string) => console.log(msg) }))

const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

// 组合：结果插件同时拥有 log 和 token
const app = defineLogger().use(defineAuth()).make()
app.log('hello')
console.log(app.token)
```

**多级嵌套：** `.use()` 接受任意插件 — 包括已经是 `.use()` 链式组合的插件。所有 API 最终合并到实例中。

```ts
const defineA = () => definePlugin(() => ({ a: 1 }))
const defineB = () => definePlugin(() => ({ b: 2 }))
const defineC = () => definePlugin(() => ({ c: 3 }))
const defineD = () => definePlugin(() => ({ d: 4 }))

// .use() 的参数可以是链式组合的插件表达式
const app = defineA().use(defineB().use(defineC())).use(defineD()).make()
console.log(app.a, app.b, app.c, app.d) // 1, 2, 3, 4
```

### `plugin.make(ctx?)`

实例化插件链。可选传入初始上下文，会与插件 API 合并。

```ts
const defineDb = () =>
  definePlugin((ctx: { connectionString: string }) => ({
    query: (sql: string) => ctx.connectionString + sql
  }))

const db = defineDb().make({ connectionString: 'postgres://...' })
db.query('SELECT 1')
```

## 插件

### `defineEventEmitter<E>(options?)`

类型安全的事件发射器，提供 `on`、`off`、`emit` 方法。

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

批量事件发射器。收集事件并在延迟后批量触发。

| 参数                | 类型                   | 默认值 | 说明             |
| ------------------- | ---------------------- | ------ | ---------------- |
| `options.onFlushed` | `(items: S[]) => void` | -      | 批量刷新时的回调 |

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
ctx.emit({ id: 1 })
ctx.emit({ id: 2 })
// 经过 batchDelay 毫秒后，onFlushed 收到 [{ id: 1 }, { id: 2 }]
```

### `defineQueue<T>(options)`

“交付即消费”的通用队列。调用 `onConsume` 后立即移除条目，不等待消费者返回的 Promise；适合 fire-and-forget 任务。消费者同步抛错或异步 rejection 会交给可选的 `onConsumeError` 观察，但不会把条目重新放回队列。

### `defineAckQueue<T>(options)`

“消费者确认后消费”的通用队列。只有 `onConsume` 返回的 Promise fulfilled 后才移除条目；rejection 只标记当前条目失败，后续条目仍会继续处理。`resume()` 或 `flush()` 可以再次尝试失败条目。

两种队列都通过 `.make()` 实例化，并共享以下选项：

| 选项             | 类型                                     | 默认值 | 说明                                                      |
| ---------------- | ---------------------------------------- | ------ | --------------------------------------------------------- |
| `onConsume`      | `(item: T) => void \| PromiseLike<void>` | -      | 必填；每个队列项的消费者                                  |
| `initialItems`   | `readonly T[]`                           | `[]`   | 创建时恢复的初始项；实例创建后的下一个 microtask 开始消费 |
| `onPersist`      | `(items: readonly T[]) => void`          | -      | 可选的同步持久化接缝；成员关系变更前先提交新的浅层快照    |
| `onConsumeError` | `(error: unknown, item: T) => unknown`   | -      | 可选的错误观察器；其自身的异常会被忽略                    |

队列实例提供 `enqueue(item)`、`pause()`、`resume()` 和 `flush(): Promise<void>`。普通 drain 严格串行；`flush()` 会并发启动调用时仍处于 pending/failed 的项，并等待本次调用涉及的操作完成。`flush()` 忽略暂停状态但不会解除暂停，新入队项不属于本次 flush 的边界。

如果提供 `onPersist`，队列采用 persist-before-commit：持久化失败时保留原成员关系并停止新的消费，`enqueue()` 同步抛出错误，`flush()` reject。`resume()` 会先重新探测当前快照，持久化恢复后才解除这个全局阻塞。`onPersist` 必须同步完成；虽然 TypeScript 的 `void` 回调类型可能接受 async 函数，运行时会拒绝 thenable 并进入 persistence-blocked 状态。

消费者可以异步返回 Promise，但不要在同一个队列消费者的异步 continuation 中调用该队列自己的 `flush()`；`flush()` 会等待在途消费者，而该消费者又在等待 `flush()`，会形成循环等待。请从消费者外部触发 `flush()`；同步执行期间的自身 `flush()` 会被立即拒绝。

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

如果不需要等待消费者 Promise fulfilled，使用 `defineQueue`；如果需要把消费者的成功结果作为移除边界，使用 `defineAckQueue`。这里的“确认”只表示消费者回调成功，不代表远端服务已经提供 exactly-once 或服务端确认。

## 类型工具

### `PluginMade<T>`

从插件工厂或插件实例中提取实例化后的类型。

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin> // { apiUrl: string; timeout: number }
```
