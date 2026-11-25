# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> JavaScript utilities and composable plugins. Works in browsers, Node.js, and workers.

English | [简体中文](./README.CN.md)

## Live demo

- [Interactive docs & playground](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

## Install

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

## Quick start

```ts
import { definePlugin } from '@greypan/js-kit'

const defineLogger = () => definePlugin(() => ({ log: (message: string) => console.log(message) }))
const defineAuth = () => definePlugin(() => ({ token: 'xxx' }))

const app = defineLogger().use(defineAuth()).make()

app.log('hello')
console.log(app.token)
```

## Modules

| Module          | Description                                                                                       | Docs                                               |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `plugin-system` | Composable plugins (`definePlugin`), `defineBatchEmitter`, `defineQueue`, `defineAckQueue`        | [`docs/plugin-system.md`](./docs/plugin-system.md) |
| `url`           | `parseUrl` and `stringifyUrl` for absolute, relative, and protocol-relative URLs                  | [`docs/url.md`](./docs/url.md)                     |
| `number`        | `clamp` and `formatFileSize`                                                                      | [`docs/number.md`](./docs/number.md)               |
| `string`        | `getFileExtension`                                                                                | [`docs/string.md`](./docs/string.md)               |
| `timer`         | `debounce` and `defineControllableInterval`                                                       | [`docs/timer.md`](./docs/timer.md)                 |
| `paradigm`      | Rust-style `Result` (`ok`, `err`, `to`, `andThen`, `unwrap`) via `rust` or `@greypan/js-kit/rust` | [`docs/paradigm.md`](./docs/paradigm.md)           |
| `shortcut`      | `safeCall` fire-and-forget wrapper                                                                | [`docs/shortcut.md`](./docs/shortcut.md)           |
| `utility-types` | Compile-time TypeScript utility types                                                             | [`docs/utility-types.md`](./docs/utility-types.md) |

## License

MIT
