# @greypan/js-kit

JavaScript 工具函数库，基于可组合插件系统

[English](./README.md) | 简体中文

## 功能

- **插件系统**：基于 `definePlugin` 的可组合插件，支持 `.use()` 链式组合和 `.make()` 实例化
- **URL**：解析和构建 URL，支持查询参数和 hash
- **Number**：精度舍入和范围限制
- **Random**：随机整数、浮点数、RGB 和十六进制颜色生成
- **Timer**：支持 leading/trailing/both 三种模式的防抖，支持暂停/恢复的可控定时器
- **Fetch**：基于 `asyncCompose` 的异步中间件组合
- **Shortcut**：fire-and-forget 的 `safeCall` 包装器
- **Paradigms**：Go 风格和 Rust 风格的 `Result` 类型工具

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
const withLogger = definePlugin(() => ({
  log: (msg: string) => console.log(msg)
}))

const withAuth = definePlugin(() => ({
  token: 'xxx'
}))

// 通过 .use() 组合插件，通过 .make() 实例化
const app = withLogger.use(withAuth).make()

app.log('hello') // 'hello'
console.log(app.token) // 'xxx'
```

## 插件

### `definePlugin(setup)`

插件系统核心。将功能封装为可组合的插件，通过 `.use()` 链式组合，`.make()` 实例化。插件内部可以注册其他插件，所有 API 最终合并到实例中。

```ts
import { definePlugin } from '@greypan/js-kit'

const withConfig = definePlugin(() => ({
  apiUrl: 'https://api.example.com'
}))

const ctx = withConfig.make()
console.log(ctx.apiUrl) // 'https://api.example.com'
```

### `defineEventEmitter<E>(options?)`

类型安全的事件发射器插件，提供 `on`、`off`、`emit` 方法。

```ts
import { defineEventEmitter } from '@greypan/js-kit'

const emitter = defineEventEmitter<{
  data: [payload: { id: number }]
  error: [err: Error]
}>()

const ctx = emitter.make()
ctx.on('data', payload => console.log(payload.id))
ctx.emit('data', { id: 1 })
```

### `defineBatchEmitter<S>(options?)`

批量事件发射器。收集事件并在延迟后批量触发。

```ts
import { defineBatchEmitter } from '@greypan/js-kit'

const batch = defineBatchEmitter<{ id: number }>({
  onFlushed: items => console.log('Flushed', items.length, 'items')
})

const ctx = batch.make()
ctx.emit({ id: 1 })
ctx.emit({ id: 2 })
```

### `defineLoopQueue<T>(options)`

异步循环队列，按顺序处理任务，支持暂停/恢复。

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
```

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

### `toPrecision(val, precision)`

将数字舍入到指定精度。支持负数精度用于十位、百位等舍入。

| 参数        | 类型     | 默认值 | 说明                           |
| ----------- | -------- | ------ | ------------------------------ |
| `val`       | `number` | -      | 待舍入的数字                   |
| `precision` | `number` | -      | 小数位数（负数用于整数位舍入） |

### `clamp(val, min, max)`

将数字限制在范围内。如果 min > max 会自动交换。

| 参数  | 类型     | 默认值 | 说明       |
| ----- | -------- | ------ | ---------- |
| `val` | `number` | -      | 待限制的值 |
| `min` | `number` | -      | 最小值     |
| `max` | `number` | -      | 最大值     |

### `random(min, max)`

生成 `[min, max]` 范围内的随机整数。

| 参数  | 类型     | 默认值 | 说明   |
| ----- | -------- | ------ | ------ |
| `min` | `number` | -      | 最小值 |
| `max` | `number` | -      | 最大值 |

### `randomFloat(min, max)`

生成 `[min, max)` 范围内的随机浮点数。

| 参数  | 类型     | 默认值 | 说明   |
| ----- | -------- | ------ | ------ |
| `min` | `number` | -      | 最小值 |
| `max` | `number` | -      | 最大值 |

### `randomRgb()`

生成随机 RGB 颜色字符串，例如 `rgb(255, 0, 0)`。

### `randomHex()`

生成随机十六进制颜色字符串，例如 `#ff0000`。

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

### `safeCall(fn, ...args)`

fire-and-forget 包装器。静默捕获同步异常和异步 rejection。

| 参数      | 类型                   | 默认值 | 说明         |
| --------- | ---------------------- | ------ | ------------ |
| `fn`      | `(...args) => unknown` | -      | 待调用的函数 |
| `...args` | `Parameters<T>`        | -      | 传递的参数   |

### `asyncCompose(...fns)`

将异步中间件函数组合为单一管道。

| 参数     | 类型           | 默认值 | 说明               |
| -------- | -------------- | ------ | ------------------ |
| `...fns` | `Middleware[]` | -      | 待组合的中间件函数 |

### `go` / `rust`

Result 类型命名空间，提供 Go 风格和 Rust 风格的错误处理。

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
import { go } from '@greypan/js-kit/go'
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
