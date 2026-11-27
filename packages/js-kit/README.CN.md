# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> 零框架依赖的 JavaScript/TypeScript 工具库与可组合插件构建器，适用于浏览器、Node.js 与 Worker。

[English](./README.md) | 简体中文

**在线文档：** [Dev Kit Demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

- **零框架依赖**：不含 DOM 或 UI 框架绑定，可在浏览器、Node.js（`>=20.11.0`）和 Worker 中运行。
- **ESM-only 与 Tree-shakable**：原生 ES Module 输出，声明 `"sideEffects": false`，支持按子路径导入单个模块。
- **严格 TypeScript 类型**：覆盖插件链组合、`Result` 范式与纯编译期类型工具的完整类型推导。

## 安装

```npm
npm install @greypan/js-kit
```

```pnpm
pnpm add @greypan/js-kit
```

```bun
bun add @greypan/js-kit
```

```yarn
yarn add @greypan/js-kit
```

## 快速开始

### 组合插件

`definePlugin` 返回一个惰性构建器。通过 `.use()` 逐层叠加能力——每个插件通过 `ctx` 访问前序插件的输出，也可覆写同名方法——最后调用 `.make()` 生成实例。

```ts
import { definePlugin } from '@greypan/js-kit/plugin-system'

const defineLogger = () =>
  definePlugin(() => ({
    log: (message: string) => console.log(`[app] ${message}`)
  }))

const definePrefix = (prefix: string) =>
  definePlugin((ctx: { log: (message: string) => void }) => ({
    log: (message: string) => ctx.log(`${prefix}: ${message}`)
  }))

const app = defineLogger().use(definePrefix('auth')).make()
app.log('token refreshed') // [app] auth: token refreshed
```

### 用 Result 处理异步错误

需要把失败表示为显式返回值、避免分散的 `try/catch` 时，可从 `@greypan/js-kit/rust` 导入 `Result` 工具。`to()` 将任意 `Promise` 包装为 `Promise<Result<T, E>>`，`andThen()` 串联后续步骤并在遇到 `Err` 时短路返回。

```ts
import { andThen, err, ok, to } from '@greypan/js-kit/rust'

const fetched = await to(Promise.resolve('{"port": 8080}'))
const port = await andThen(fetched, raw => {
  const data = JSON.parse(raw) as { port?: number }
  return typeof data.port === 'number' ? ok(data.port) : err(new Error('Missing port'))
})

if (port.ok) {
  console.log('Listening on', port.value) // Listening on 8080
} else {
  console.error(port.error)
}
```

## 子路径导入

可以直接从根入口 `@greypan/js-kit` 导入全部能力，或按子路径按需引入以缩小打包体积：

```ts
// 根入口：全部模块 + `rust` 命名空间
import { definePlugin, parseUrl, rust } from '@greypan/js-kit'
// 顶层 `Result` 工具函数，无需 `rust.` 前缀
import { andThen, err, ok, to } from '@greypan/js-kit/rust'
import { debounce, defineControllableInterval } from '@greypan/js-kit/timer'
// 按模块子路径导入
import { parseUrl, stringifyUrl } from '@greypan/js-kit/url'
```

全部模块目录（`plugin-system`、`url`、`number`、`string`、`timer`、`paradigm`、`shortcut`、`utility-types`）均可通过 `@greypan/js-kit/<module>` 导入。

## 模块总览

| 模块                                          | 子路径                          | 解决什么问题                                        | 核心导出                                                                                                                         |
| --------------------------------------------- | ------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`plugin-system`](./docs/plugin-system.CN.md) | `@greypan/js-kit/plugin-system` | 可组合插件构建器、批量发射器、待消费队列与确认队列  | `definePlugin`、`defineBatchEmitter`、`defineQueue`、`defineAckQueue`、`Plugin`、`PluginMade`、`QueueOptions`、`QueueController` |
| [`paradigm`](./docs/paradigm.CN.md)           | `@greypan/js-kit/paradigm`      | Rust 风格 `Result<T, E>` 错误处理（另提供 `/rust`） | `rust`（`ok`、`err`、`isOk`、`isErr`、`to`、`andThen`、`unwrap`、`Ok`、`Err`、`Result`）                                         |
| [`url`](./docs/url.CN.md)                     | `@greypan/js-kit/url`           | 解析与序列化完整 URL、站内相对路径及协议相对地址    | `parseUrl`、`stringifyUrl`                                                                                                       |
| [`timer`](./docs/timer.CN.md)                 | `@greypan/js-kit/timer`         | 带取消/冲刷控制的防抖器与可暂停定时器插件           | `debounce`、`defineControllableInterval`                                                                                         |
| [`shortcut`](./docs/shortcut.CN.md)           | `@greypan/js-kit/shortcut`      | 吞掉同步异常与异步 rejection 的兜底调用             | `safeCall`、`SafeCallOptions`                                                                                                    |
| [`number`](./docs/number.CN.md)               | `@greypan/js-kit/number`        | 数值区间钳制与可读文件大小格式化                    | `clamp`、`formatFileSize`                                                                                                        |
| [`string`](./docs/string.CN.md)               | `@greypan/js-kit/string`        | 带边界校验的小写文件扩展名提取                      | `getFileExtension`                                                                                                               |
| [`utility-types`](./docs/utility-types.CN.md) | `@greypan/js-kit/utility-types` | 零运行时开销的 TypeScript 工具类型                  | `DeepPartial`、`DeepRequired`、`ValueOf`、`ArrayItem`、`ArgumentType`、`Equal`、`ClassPropertyTypes`                             |

## 关键行为说明

- **队列与批量发射**：`defineBatchEmitter` 在 `batchingDelay` 窗口内合并高频调用并提供 `flush()` 立即冲刷。`defineQueue` 交付即视为完成；`defineAckQueue` 仅在 `onConsume` 成功 fulfill 后移除条目，单条失败保留为失败状态且不阻塞后续条目，显式调用 `resume()` 或 `flush()` 时重试。两种队列均支持同步 `onPersist` 持久化快照（先持久化再提交内存状态）。
- **相对路径 URL**：`parseUrl` 与 `stringifyUrl` 支持完整 URL、站内相对路径（`/api/items?page=1`）和协议相对地址（`//cdn.example.com/a.js`），不会因缺少 origin 抛错。`stringifyUrl` 默认忽略 `null`/`undefined` 参数（`omitNil = true`）。
- **定时器**：`debounce(fn, options)` 返回控制对象（`{ call, cancel, flush, isPending, cachedValue }`），支持 `waitMs`、`maxWaitMs` 和 `timing`（`'trailing' | 'leading' | 'both'`）。`defineControllableInterval` 返回插件，`.make()` 实例化后提供 `start()`、`pause()`、`resume()`、`stop()` 和 `tick(delay)`，并在暂停期间保留剩余时间。
- **兜底调用**：`safeCall(fn, { onError })` 同时捕获同步抛出与异步 rejection，并会吸收 `onError` 自身抛出的异常，适合清理钩子和事件监听器。
- **纯编译期类型**：从 `@greypan/js-kit/utility-types` 导入不会产生任何运行时 JavaScript 代码。

> 面向浏览器的存储、埋点上报、环境检测、DOM、文件、剪贴板和历史导航工具位于 [`@greypan/browser-kit`](../browser-kit/README.CN.md)。

## License

MIT
