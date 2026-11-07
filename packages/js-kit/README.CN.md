# @greypan/js-kit

> JavaScript 工具函数与可组合插件，可用于浏览器、Node.js 和 Worker。

[English](./README.md) | 简体中文

## 安装

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

## 快速开始

```ts
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()

app.log('hello')
console.log(app.token)
```

## 提供什么

- 用 `definePlugin`、`.use()` 和 `.make()` 组合插件。
- 解析和构建带查询参数与 hash 的 URL。
- 文件大小、数值范围和文件扩展名等数字与字符串工具。
- 防抖函数与可控定时器。
- 用于 fire-and-forget 任务的 `safeCall` 包装器。
- 不依赖异常的错误处理 Result 值。
- 共享 TypeScript 工具类型。

## 插件

### `definePlugin(setup)`

创建插件。用 `.use()` 组合其他插件，再用 `.make()` 创建实例。

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () => definePlugin(() => ({ apiUrl: 'https://api.example.com' }))
const config = defineConfig().make()

console.log(config.apiUrl)
```

| 参数    | 类型            | 说明                           |
| ------- | --------------- | ------------------------------ |
| `setup` | `(ctx: D) => C` | 接收共享上下文并返回插件 API。 |

### `defineBatchEmitter<S>(options?)`

收集事件，并在延迟后以一批发送。

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
await ctx.batchEmit({ id: 1 })
await ctx.batchEmit({ id: 2 })
```

`batchEmit(data, delay = 0)` 以本次发送的批次 resolve。`delay` 为 `0` 或负数时立即发送 `[data]`，正数时按延迟聚合事件。`flush()` 立即发送当前队列。

| 参数                | 类型                                    | 默认值 | 说明             |
| ------------------- | --------------------------------------- | ------ | ---------------- |
| `options.onFlushed` | `(items: S[]) => void \| Promise<void>` | -      | 每批发送时调用。 |

### `defineQueue<T>(options)`

用于 fire-and-forget 任务的队列。调用 `onConsume` 后立即移除条目，不等待返回的 Promise。

### `defineAckQueue<T>(options)`

等待消费者完成的队列。`onConsume` 返回的 Promise resolve 后才移除条目。reject 只影响当前条目，`resume()` 或 `flush()` 可以重试失败条目。

两种队列都提供 `enqueue()`、`pause()`、`resume()` 和异步 `flush()`，并支持 `initialItems`、同步快照回调 `onPersist` 与 `onConsumeError`。

完整参数表、持久化行为，以及在消费者内调用 `flush()` 的限制见 [`src/plugin-system/README.CN.md`](./src/plugin-system/README.CN.md)。

## URL

### `parseUrl(url?)`

把 URL 字符串解析为 `base`、`query` 和 `hash`。支持相对 URL 与协议相对 URL。

| 参数  | 类型     | 默认值 | 说明         |
| ----- | -------- | ------ | ------------ |
| `url` | `string` | `''`   | 待解析的 URL |

### `stringifyUrl(opts, omitNil?)`

用 `base`、`query` 和 `hash` 构建 URL 字符串。

| 参数      | 类型                 | 默认值 | 说明                              |
| --------- | -------------------- | ------ | --------------------------------- |
| `opts`    | `Partial<URLObject>` | -      | URL 组件：`base`、`query`、`hash` |
| `omitNil` | `boolean`            | `true` | 是否移除查询参数中的空值。        |

示例与边界行为见 [`src/url/README.CN.md`](./src/url/README.CN.md)。

## 数字与字符串

### `clamp(val, min, max)`

把数字限制在范围内。`min` 大于 `max` 时会自动交换。

### `formatFileSize(bytes, decimals?)`

把字节数格式化为可读字符串，例如 `'1.23 KB'`。

| 参数       | 类型     | 默认值 | 说明     |
| ---------- | -------- | ------ | -------- |
| `bytes`    | `number` | -      | 字节数   |
| `decimals` | `number` | `2`    | 小数位数 |

### `getFileExtension(filename)`

返回文件名的扩展名。输入为空或没有扩展名时抛错。

## 定时器

### `defineControllableInterval(options)`

创建可暂停和恢复的定时器。实例提供 `start`、`pause`、`resume`、`stop` 和 `tick`。

| 方法          | 说明                                                |
| ------------- | --------------------------------------------------- |
| `start()`     | 启动定时器。已暂停的定时器应使用 `resume()`。       |
| `pause()`     | 暂停并保留当前周期的剩余时间。                      |
| `resume()`    | 从剩余时间继续，不重新开始整个周期。                |
| `stop()`      | 取消定时器并重置状态。                              |
| `tick(delay)` | 在 `delay` 毫秒后额外执行一次回调，不改变暂停状态。 |

```ts
const timer = defineControllableInterval({ callback: () => console.log('tick'), interval: 1000 }).make()
timer.start()
```

### `debounce(func, options?)`

防抖函数。返回 `call`、`cancel`、`flush`、`isPending` 和 `cachedValue`。

| 参数      | 类型                                                                                  | 默认值 | 说明       |
| --------- | ------------------------------------------------------------------------------------- | ------ | ---------- |
| `func`    | `Function`                                                                            | -      | 待防抖函数 |
| `options` | `{ timing?: 'trailing' \| 'leading' \| 'both'; waitMs?: number; maxWaitMs?: number }` | -      | 防抖参数   |

`maxWaitMs` 不能小于 `waitMs`。`leading` 模式不接受 `maxWaitMs`。

## 错误处理

### `safeCall(fn, options?)`

调用函数时不在调用点处理错误。同步异常和 Promise rejection 默认被忽略。传入 `onError` 可以接收它们。

| 参数      | 类型                                 | 默认值 | 说明         |
| --------- | ------------------------------------ | ------ | ------------ |
| `fn`      | `() => unknown`                      | -      | 待调用的函数 |
| `options` | `{ onError?: (e: unknown) => void }` | -      | 可选错误出口 |

### `rust`

不用异常的 Result 工具。

| 方法                    | 说明                                                |
| ----------------------- | --------------------------------------------------- |
| `ok(value)`             | 创建成功结果。                                      |
| `err(error)`            | 创建错误结果。                                      |
| `isOk(result)`          | 判断是否为成功结果。                                |
| `isErr(result)`         | 判断是否为错误结果。                                |
| `to(promise)`           | 把 Promise 转为 `Ok`，或把 rejection 捕获为 `Err`。 |
| `andThen(result, next)` | 接上下一步：`Ok` 交给 `next` 执行，`Err` 原样返回。 |
| `unwrap(result)`        | 返回成功值或错误载荷，不会抛错。                    |

```ts
import { rust } from '@greypan/js-kit/rust'
// 也可以从 '@greypan/js-kit' 导入

const result = await rust.to(fetch('/api/user'))
if (rust.isOk(result)) console.log(result.value)
else console.error(rust.unwrap(result))
```

## 类型工具

| 类型                    | 说明                           |
| ----------------------- | ------------------------------ |
| `ValueOf<T>`            | 对象所有值类型的联合。         |
| `ArrayItem<T>`          | 数组元素类型。                 |
| `ArgumentType<T>`       | 函数参数类型的联合。           |
| `DeepPartial<T>`        | 递归可选。                     |
| `DeepRequired<T>`       | 递归必选。                     |
| `ClassPropertyTypes<T>` | 类属性类型。                   |
| `Equal<X, Y>`           | 类型相等性检查。               |
| `PluginMade<T>`         | 插件工厂或插件实例化后的类型。 |
