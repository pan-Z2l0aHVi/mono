---
title: 插件系统
---

# 插件系统

`definePlugin` 提供零依赖、带类型推导的插件构建器，是 `@greypan/js-kit` 与 `@greypan/browser-kit` 内部共享的组合底座。本模块同时提供基于它构建的三个常用插件：`defineBatchEmitter`、`defineQueue` 和 `defineAckQueue`。

## 使用 `definePlugin` 组合能力

向 `definePlugin` 传入工厂函数 `(ctx) => exports`。每次调用 `.use()` 会把新插件的返回值合并到累积上下文 `ctx` 上，最后调用 `.make()` 执行整条链并返回最终实例。

- **方法覆写。** 后注册的插件如果返回与前序插件同名的属性，会覆写最终实例上的该属性，同时仍可通过 `ctx` 调用旧实现。
- **提取实例类型。** 使用 `PluginMade<typeof defineMyPlugin>` 获取某个插件工厂 `.make()` 后的返回类型。

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

## 使用 `defineBatchEmitter` 批量聚合

`defineBatchEmitter` 在指定延迟窗口内收集通过 `batchEmit(item, delay)` 写入的条目，到期后一次性调用 `onFlushed(items)`。调用 `flush()` 可立即冲刷当前缓冲。

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

## 使用 `defineAckQueue` 实现至少一次消费

`defineAckQueue` 按 FIFO 顺序逐条消费，只有在 `onConsume` 成功 resolve 后才移出队头条目。如果 `onConsume` 抛错或 reject，该条目会留在队头，等待下次 `resume()` 或 `flush()` 重试。

如果不需要失败保留与重试语义，可以直接使用 `defineQueue`。

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

| 导出                                 | 说明                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `definePlugin(setup)`                | 创建可组合插件构建器，提供 `.use()` 与 `.make()`                   |
| `PluginMade<T>`                      | 提取插件工厂最终实例类型的工具类型                                 |
| `defineBatchEmitter({ onFlushed })`  | 在延迟窗口内聚合调用，提供 `batchEmit(item, delay)` 与 `flush()`   |
| `defineQueue({ onConsume, ... })`    | FIFO 队列，支持 `enqueue`、`pause`、`resume`、`flush` 与可选持久化 |
| `defineAckQueue({ onConsume, ... })` | 带确认语义的 FIFO 队列，消费失败时保留队头条目等待重试             |
