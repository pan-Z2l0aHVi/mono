# @greypan/js-kit

> JavaScript 工具函数库，基于可组合插件系统

[English](./README.md) | 简体中文

## 功能

- **插件系统**：基于 `definePlugin` 的可组合插件，支持 `.use()` 链式组合和 `.make()` 实例化
- **URL**：解析和构建 URL，支持查询参数和 hash
- **Number**：精度舍入和范围限制
- **Timer**：支持 leading/trailing/both 三种模式的防抖，支持暂停/恢复的可控定时器
- **Shortcut**：fire-and-forget 的 `safeCall` 包装器
- **Paradigm**：Rust 风格的 `Result` 类型工具

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

// 定义可复用的插件
const defineLogger = () => definePlugin(() => ({ log: (msg: string) => console.log(msg) }))

const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

// 通过 .use() 组合插件，通过 .make() 实例化
const app = defineLogger().use(defineAuth()).make()

app.log('hello') // 'hello'
console.log(app.token) // 'xxx'
```

## 插件

### `definePlugin(setup)`

插件系统核心。将功能封装为可组合的插件，通过 `.use()` 链式组合，`.make()` 实例化。插件内部可以注册其他插件，所有 API 最终合并到实例中。

```ts
import { definePlugin } from '@greypan/js-kit'

const defineConfig = () => definePlugin(() => ({ apiUrl: 'https://api.example.com' }))

const ctx = defineConfig().make()
console.log(ctx.apiUrl) // 'https://api.example.com'
```

### `defineBatchEmitter<S>(options?)`

批量事件发射器。收集事件并在延迟后批量触发。

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

“交付即消费”的通用队列。调用 `onConsume` 后立即移除条目，不等待消费者返回的 Promise；适合 fire-and-forget 任务。

### `defineAckQueue<T>(options)`

“消费者确认后消费”的通用队列。只有 `onConsume` 返回的 Promise fulfilled 后才移除条目；rejection 只影响当前项，失败项可由 `resume()` 或 `flush()` 再次尝试。

两种队列都提供 `enqueue()`、`pause()`、`resume()` 和异步 `flush()`，并支持 `initialItems`、同步 `onPersist` 快照持久化以及 `onConsumeError`。完整选项表、flush 与 persist-before-commit 语义、以及在消费者内调用 `flush()` 的循环等待约束见 [`src/plugin-system/README.md`](./src/plugin-system/README.md)。

## API

### `definePlugin<C, D>(setup)`

插件工厂核心函数。创建可通过 `.use()` 组合、`.make()` 实例化的插件。

| 参数    | 类型            | 默认值 | 说明                               |
| ------- | --------------- | ------ | ---------------------------------- |
| `setup` | `(ctx: D) => C` | -      | 设置函数，接收上下文并返回插件 API |

### `PluginMade<T>`

类型工具，从插件工厂或插件实例中提取实例化后的类型。

### `parseUrl(url?)`

将 URL 字符串解析为结构化对象，支持相对路径。

| 参数  | 类型     | 默认值 | 说明         |
| ----- | -------- | ------ | ------------ |
| `url` | `string` | `''`   | 待解析的 URL |

### `stringifyUrl(opts, omitNil?)`

从结构化组件构建 URL 字符串。

| 参数      | 类型                 | 默认值 | 说明                              |
| --------- | -------------------- | ------ | --------------------------------- |
| `opts`    | `Partial<URLObject>` | -      | URL 组件：`base`、`query`、`hash` |
| `omitNil` | `boolean`            | `true` | 是否移除查询参数中的空值          |

完整的 `URLObject` 结构、相对路径行为与示例见 [`src/url/README.md`](./src/url/README.md)。

### `clamp(val, min, max)`

将数字限制在范围内。如果 min > max 会自动交换。

| 参数  | 类型     | 默认值 | 说明       |
| ----- | -------- | ------ | ---------- |
| `val` | `number` | -      | 待限制的值 |
| `min` | `number` | -      | 最小值     |
| `max` | `number` | -      | 最大值     |

### `getFileExtension(filename)`

从文件名中提取扩展名。输入为空或没有扩展名时抛错。

| 参数       | 类型     | 默认值 | 说明   |
| ---------- | -------- | ------ | ------ |
| `filename` | `string` | -      | 文件名 |

### `formatFileSize(bytes, decimals?)`

将字节数格式化为可读字符串，例如 `'1.23 KB'`。

| 参数       | 类型     | 默认值 | 说明     |
| ---------- | -------- | ------ | -------- |
| `bytes`    | `number` | -      | 字节数   |
| `decimals` | `number` | `2`    | 小数位数 |

### `defineControllableInterval(options)`

创建可控定时器，支持暂停/恢复。返回包含 `start`、`pause`、`resume`、`stop` 方法的插件。

| 参数      | 类型                                         | 默认值 | 说明       |
| --------- | -------------------------------------------- | ------ | ---------- |
| `options` | `{ callback: () => void; interval: number }` | -      | 定时器配置 |

### `debounce(func, options?)`

防抖函数，支持三种 timing 模式。

| 参数      | 类型                                                                                 | 默认值 | 说明         |
| --------- | ------------------------------------------------------------------------------------ | ------ | ------------ |
| `func`    | `Function`                                                                           | -      | 待防抖的函数 |
| `options` | `{ timing?: 'trailing' \| 'leading' \| 'both'; waitMs: number; maxWaitMs?: number }` | -      | 防抖选项     |

### `safeCall(fn, options?)`

fire-and-forget 包装器。捕获同步异常和异步 rejection；默认静默吞掉，传入 `options.onError` 时转发给它。`onError` 自身的失败同样被吞掉，调用始终保持 fire-and-forget。

| 参数      | 类型                                 | 默认值 | 说明           |
| --------- | ------------------------------------ | ------ | -------------- |
| `fn`      | `() => unknown`                      | -      | 待调用的 thunk |
| `options` | `{ onError?: (e: unknown) => void }` | -      | 可选错误出口   |

### `rust`

Result 类型命名空间，提供 Rust 风格的错误处理。

| 方法             | 说明                    |
| ---------------- | ----------------------- |
| `ok(value)`      | 创建成功结果            |
| `err(error)`     | 创建错误结果            |
| `isOk(result)`   | 检查结果是否成功        |
| `isErr(result)`  | 检查结果是否失败        |
| `to(fn)`         | 包装函数使其返回 Result |
| `unwrap(result)` | 提取值或抛出错误        |

**导入路径：**

```ts
import { rust } from '@greypan/js-kit/rust'
```

### 类型工具

| 类型                    | 说明                 |
| ----------------------- | -------------------- |
| `ValueOf<T>`            | 对象所有值类型的联合 |
| `ArrayItem<T>`          | 数组元素类型         |
| `ArgumentType<T>`       | 函数第一个参数的类型 |
| `DeepPartial<T>`        | 深度可选             |
| `DeepRequired<T>`       | 深度必选             |
| `ClassPropertyTypes<T>` | 类属性类型           |
| `Equal<X, Y>`           | 类型相等性检查       |
