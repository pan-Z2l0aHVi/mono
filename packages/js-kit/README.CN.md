# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> 零框架依赖的 JavaScript 工具库与可组合插件系统，适用于浏览器、Node.js 和 Worker。

[English](./README.md) | 简体中文 | [在线演示](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

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

## 导入入口

默认入口 `@greypan/js-kit` 导出全部运行时工具和 TypeScript 工具类型。如果希望缩小导入范围或直接使用顶层 `Result` 函数，可以按子路径导入：

- `@greypan/js-kit` 导出全部模块，以及命名空间对象 `rust`。
- `@greypan/js-kit/rust` 直接在顶层导出 `ok`、`err`、`isOk`、`isErr`、`to`、`andThen`、`map`、`mapErr` 和 `unwrap`。
- `@greypan/js-kit/plugin-system`、`@greypan/js-kit/timer` 和 `@greypan/js-kit/paradigm` 分别对应各自独立模块。

## 快速开始

### 组合插件

`definePlugin` 返回一个惰性构建器。通过 `.use()` 逐层叠加能力，后注册的插件通过 `ctx` 访问前序插件的返回值，并可以覆盖同名方法；最后调用 `.make()` 生成实例。

```ts
import { definePlugin } from '@greypan/js-kit'

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

### 用 `Result` 处理错误

当希望把错误作为显式返回值而不是到处写 `try/catch` 时，可以从 `@greypan/js-kit/rust` 导入 `Result` 工具。`to()` 会把同步抛错或异步 rejection 转为 `Result<T, E>`。

```ts
import { andThen, err, ok, to } from '@greypan/js-kit/rust'

const parsed = to(() => JSON.parse('{"port": 8080}') as { port?: number })
const port = andThen(parsed, data => (typeof data.port === 'number' ? ok(data.port) : err(new Error('Missing port'))))

if (port.ok) {
  console.log('Listening on', port.value)
} else {
  console.error(port.error.message)
}
```

## 使用细节

- **批量发射与确认队列。** `defineBatchEmitter` 在延迟窗口内合并高频调用，并提供 `flush()` 立即冲刷。`defineAckQueue` 只有在 `onConsume` 成功 resolve 后才移出队头元素；如果消费失败，元素会保留在队列中等待下次 `resume()` 或 `flush()` 重试。
- **相对路径 URL 解析。** `parseUrl` 与 `stringifyUrl` 支持完整 URL、站内相对路径（`/api/items?page=1`）和协议相对地址（`//cdn.example.com/a.js`），不会因为缺少 origin 而抛错。
- **定时器控制。** `debounce` 返回的包装函数带有 `.cancel()` 和 `.flush()`。`defineControllableInterval` 支持 `start()`、`pause()`、`resume()`、`restart()` 和 `stop()`，并在暂停期间保留剩余时间。
- **兜底调用。** `safeCall(fn, { onError })` 同时捕获同步异常和异步 rejection，适合放在卸载钩子或事件监听器里，避免产生未处理的 Promise 拒绝。
- **纯编译期类型。** `DeepPartial`、`DeepRequired`、`ValueOf`、`ArrayItem`、`ArgumentType`、`Equal` 和 `ClassPropertyTypes` 不产生任何运行时代码。

## 模块索引

| 模块            | 导出内容                                                                                             | 文档                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `plugin-system` | `definePlugin`、`defineBatchEmitter`、`defineQueue`、`defineAckQueue`、`PluginMade`                  | [`docs/plugin-system.CN.md`](./docs/plugin-system.CN.md) |
| `url`           | `parseUrl`、`stringifyUrl`                                                                           | [`docs/url.CN.md`](./docs/url.CN.md)                     |
| `number`        | `clamp`、`formatFileSize`                                                                            | [`docs/number.CN.md`](./docs/number.CN.md)               |
| `string`        | `getFileExtension`                                                                                   | [`docs/string.CN.md`](./docs/string.CN.md)               |
| `timer`         | `debounce`、`defineControllableInterval`                                                             | [`docs/timer.CN.md`](./docs/timer.CN.md)                 |
| `paradigm`      | `rust`（`ok`、`err`、`to`、`andThen`、`map`、`mapErr`、`unwrap`）                                    | [`docs/paradigm.CN.md`](./docs/paradigm.CN.md)           |
| `shortcut`      | `safeCall`                                                                                           | [`docs/shortcut.CN.md`](./docs/shortcut.CN.md)           |
| `utility-types` | `DeepPartial`、`DeepRequired`、`ValueOf`、`ArrayItem`、`ArgumentType`、`Equal`、`ClassPropertyTypes` | [`docs/utility-types.CN.md`](./docs/utility-types.CN.md) |

> 面向浏览器的存储、埋点上报、环境检测、DOM、文件、剪贴板和历史导航工具位于 [`@greypan/browser-kit`](../browser-kit/README.CN.md)。

## License

MIT
