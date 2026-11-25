# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> 通用 JavaScript / TypeScript 工具函数与可组合插件系统，适用于浏览器、Node.js 与 Worker。

[English](./README.md) | 简体中文

## 在线示例

- [交互文档与示例站](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

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

```ts
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()

app.log('hello')
console.log(app.token)
```

## 模块索引

| 模块            | 说明                                                                                      | 文档                                                     |
| --------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `plugin-system` | 可组合插件（`definePlugin`）、`defineBatchEmitter`、`defineQueue`、`defineAckQueue`       | [`docs/plugin-system.CN.md`](./docs/plugin-system.CN.md) |
| `url`           | `parseUrl` 与 `stringifyUrl`，支持绝对/相对/协议相对 URL                                  | [`docs/url.CN.md`](./docs/url.CN.md)                     |
| `number`        | `clamp` 与 `formatFileSize`                                                               | [`docs/number.CN.md`](./docs/number.CN.md)               |
| `string`        | `getFileExtension`                                                                        | [`docs/string.CN.md`](./docs/string.CN.md)               |
| `timer`         | `debounce` 与 `defineControllableInterval`                                                | [`docs/timer.CN.md`](./docs/timer.CN.md)                 |
| `paradigm`      | Rust 风格 `Result`（`ok`、`err`、`to`、`andThen`、`unwrap`），支持 `@greypan/js-kit/rust` | [`docs/paradigm.CN.md`](./docs/paradigm.CN.md)           |
| `shortcut`      | `safeCall` 安全执行封装                                                                   | [`docs/shortcut.CN.md`](./docs/shortcut.CN.md)           |
| `utility-types` | 编译期 TypeScript 工具类型                                                                | [`docs/utility-types.CN.md`](./docs/utility-types.CN.md) |

## 许可证

MIT
