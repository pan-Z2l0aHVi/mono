# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> Framework-free JavaScript utilities and composable plugins for browsers, Node.js, and workers.

English | [简体中文](./README.CN.md) | [Live demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

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

## Entry points

Import from `@greypan/js-kit` for all runtime helpers and TypeScript utility types. If you want smaller imports or shorter names for `Result` helpers, use the subpaths below:

- `@greypan/js-kit` exports every module, plus the `rust` namespace object.
- `@greypan/js-kit/rust` exports `ok`, `err`, `isOk`, `isErr`, `to`, `andThen`, `map`, `mapErr`, and `unwrap` at top level.
- `@greypan/js-kit/plugin-system`, `@greypan/js-kit/timer`, and `@greypan/js-kit/paradigm` expose individual modules directly.

## Quick start

### Composing plugins

`definePlugin` creates a lazy plugin builder. Chain `.use()` to layer capabilities where each plugin receives the previous output as `ctx`, then call `.make()` to build the final instance. Later plugins can override methods from earlier ones while still calling `ctx.<method>()` internally.

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

### Handling errors with `Result`

Use `@greypan/js-kit/rust` when you want explicit error values instead of `try/catch` blocks. `to()` turns any throwing function or rejected promise into a `Result<T, E>`.

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

## Practical usage notes

- **Queues and batching.** `defineBatchEmitter` merges rapid calls within a delay window and exposes `flush()` for immediate delivery. `defineAckQueue` removes an item only after `onConsume` fulfills; if `onConsume` rejects, the item stays at the head of the queue for the next `resume()` or `flush()`.
- **Relative URLs.** `parseUrl` and `stringifyUrl` accept full URLs, root-relative paths (`/api/items?page=1`), and protocol-relative URLs (`//cdn.example.com/a.js`) without throwing on a missing origin.
- **Timers.** `debounce` returns a wrapper with `.cancel()` and `.flush()`. `defineControllableInterval` supports `start()`, `pause()`, `resume()`, `restart()`, and `stop()`, and tracks elapsed time across pauses.
- **Fire-and-forget calls.** `safeCall(fn, { onError })` catches both synchronous throws and rejected promises, which is useful in cleanup hooks and event listeners that must not trigger unhandled rejections.
- **Compile-time types.** `DeepPartial`, `DeepRequired`, `ValueOf`, `ArrayItem`, `ArgumentType`, `Equal`, and `ClassPropertyTypes` produce zero runtime code.

## Modules

| Module          | Exports                                                                                              | Docs                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `plugin-system` | `definePlugin`, `defineBatchEmitter`, `defineQueue`, `defineAckQueue`, `PluginMade`                  | [`docs/plugin-system.md`](./docs/plugin-system.md) |
| `url`           | `parseUrl`, `stringifyUrl`                                                                           | [`docs/url.md`](./docs/url.md)                     |
| `number`        | `clamp`, `formatFileSize`                                                                            | [`docs/number.md`](./docs/number.md)               |
| `string`        | `getFileExtension`                                                                                   | [`docs/string.md`](./docs/string.md)               |
| `timer`         | `debounce`, `defineControllableInterval`                                                             | [`docs/timer.md`](./docs/timer.md)                 |
| `paradigm`      | `rust` (`ok`, `err`, `to`, `andThen`, `map`, `mapErr`, `unwrap`)                                     | [`docs/paradigm.md`](./docs/paradigm.md)           |
| `shortcut`      | `safeCall`                                                                                           | [`docs/shortcut.md`](./docs/shortcut.md)           |
| `utility-types` | `DeepPartial`, `DeepRequired`, `ValueOf`, `ArrayItem`, `ArgumentType`, `Equal`, `ClassPropertyTypes` | [`docs/utility-types.md`](./docs/utility-types.md) |

> Browser-specific helpers for storage, telemetry tracking, environment detection, DOM, files, clipboard, and history live in [`@greypan/browser-kit`](../browser-kit/README.md).

## License

MIT
