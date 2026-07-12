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

const withConfig = definePlugin(() => ({
  apiUrl: 'https://api.example.com',
  timeout: 5000
}))

// 通过 .make() 实例化
const config = withConfig.make()
console.log(config.apiUrl) // 'https://api.example.com'
```

### `plugin.use(otherPlugin)`

链式组合插件。结果插件合并两者的 API。

```ts
const withLogger = definePlugin(() => ({
  log: (msg: string) => console.log(msg)
}))

const withAuth = definePlugin(() => ({
  token: 'xxx'
}))

// 组合：结果插件同时拥有 log 和 token
const app = withLogger.use(withAuth).make()
app.log('hello')
console.log(app.token)
```

**多级嵌套：** `.use()` 接受任意插件 — 包括已经是 `.use()` 链式组合的插件。所有 API 最终合并到实例中。

```ts
const withA = definePlugin(() => ({ a: 1 }))
const withB = definePlugin(() => ({ b: 2 }))
const withC = definePlugin(() => ({ c: 3 }))
const withD = definePlugin(() => ({ d: 4 }))

// .use() 的参数可以是链式组合的插件表达式
const app = withA.use(withB.use(withC)).use(withD).make()
console.log(app.a, app.b, app.c, app.d) // 1, 2, 3, 4
```

### `plugin.make(ctx?)`

实例化插件链。可选传入初始上下文，会与插件 API 合并。

```ts
const withDb = definePlugin((ctx: { connectionString: string }) => ({
  query: (sql: string) => ctx.connectionString + sql
}))

const db = withDb.make({ connectionString: 'postgres://...' })
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

### `defineLoopQueue<T>(options)`

异步循环队列，按顺序处理任务，支持自动消费。

| 参数                   | 类型                         | 默认值 | 说明                 |
| ---------------------- | ---------------------------- | ------ | -------------------- |
| `options.onConsume`    | `(item: T) => Promise<void>` | -      | 每个队列项的处理函数 |
| `options.initialQueue` | `T[]`                        | `[]`   | 初始队列项           |

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
ctx.pause() // 暂停处理
ctx.resume() // 恢复处理
ctx.flush() // 立即处理所有剩余项
```

## 类型工具

### `PluginMade<T>`

从插件工厂或插件实例中提取实例化后的类型。

```ts
type MyPlugin = typeof withConfig
type Instance = PluginMade<MyPlugin> // { apiUrl: string; timeout: number }
```
