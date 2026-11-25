# @greypan/js-kit

[![npm version](https://img.shields.io/npm/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![npm downloads](https://img.shields.io/npm/dm/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![node version](https://img.shields.io/node/v/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)
[![CI](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml/badge.svg)](https://github.com/pan-Z2l0aHVi/mono/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/npm/l/@greypan/js-kit)](https://www.npmjs.com/package/@greypan/js-kit)

> Framework-free JavaScript/TypeScript utilities and a composable plugin builder for browsers, Node.js, and workers.

English | [简体中文](./README.CN.md) | [Live demo](https://pan-z2l0ahvi.github.io/mono/dev-kit-demo/js-kit/getting-started)

- **Zero framework dependencies**: Runtime-agnostic code with no DOM or UI framework bindings; works in browsers, Node.js (`>=20.11.0`), and workers.
- **ESM-only & tree-shakable**: Published as native ES modules with `"sideEffects": false` and per-module subpath exports.
- **Strict TypeScript types**: Full inference across plugin chains, `Result` helpers, and compile-time utility types.

## Installation

```bash
npm install @greypan/js-kit
# or
pnpm add @greypan/js-kit
yarn add @greypan/js-kit
bun add @greypan/js-kit
```

## Quick start

### Composing plugins

`definePlugin` creates a lazy builder. Chain `.use()` to layer capabilities—each plugin receives the accumulated output as `ctx` and can override earlier methods—then call `.make()` to build the instance.

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

### Handling async errors with `Result`

Use `@greypan/js-kit/rust` to represent failures as values instead of scattering `try/catch` blocks. `to()` wraps any `Promise` into a `Promise<Result<T, E>>`, and `andThen()` chains follow-up steps while short-circuiting on `Err`.

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

## Subpath exports

Import from the root entry `@greypan/js-kit` for everything, or import individual modules by subpath to narrow your bundle surface:

```ts
// Root entry: all modules + `rust` namespace
import { definePlugin, parseUrl, rust } from '@greypan/js-kit'
// Top-level `Result` helpers without the `rust.` prefix
import { andThen, err, ok, to } from '@greypan/js-kit/rust'
import { debounce, defineControllableInterval } from '@greypan/js-kit/timer'
// Individual module subpaths
import { parseUrl, stringifyUrl } from '@greypan/js-kit/url'
```

All module directories (`plugin-system`, `url`, `number`, `string`, `timer`, `paradigm`, `shortcut`, `utility-types`) are exposed via `@greypan/js-kit/<module>`.

## Modules

| Module                                     | Subpath                         | What it solves                                                              | Core exports                                                                                                                     |
| ------------------------------------------ | ------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| [`plugin-system`](./docs/plugin-system.md) | `@greypan/js-kit/plugin-system` | Composable plugin builder, batching emitter, fire-and-forget & ack queues   | `definePlugin`, `defineBatchEmitter`, `defineQueue`, `defineAckQueue`, `Plugin`, `PluginMade`, `QueueOptions`, `QueueController` |
| [`paradigm`](./docs/paradigm.md)           | `@greypan/js-kit/paradigm`      | Rust-style `Result<T, E>` error handling (also available at `/rust`)        | `rust` (`ok`, `err`, `isOk`, `isErr`, `to`, `andThen`, `unwrap`, `Ok`, `Err`, `Result`)                                          |
| [`url`](./docs/url.md)                     | `@greypan/js-kit/url`           | Parsing and serializing absolute, root-relative, and protocol-relative URLs | `parseUrl`, `stringifyUrl`                                                                                                       |
| [`timer`](./docs/timer.md)                 | `@greypan/js-kit/timer`         | Debouncer with cancel/flush control and pauseable interval plugin           | `debounce`, `defineControllableInterval`                                                                                         |
| [`shortcut`](./docs/shortcut.md)           | `@greypan/js-kit/shortcut`      | Fire-and-forget execution that absorbs sync throws and async rejections     | `safeCall`, `SafeCallOptions`                                                                                                    |
| [`number`](./docs/number.md)               | `@greypan/js-kit/number`        | Numeric range clamping and human-readable byte formatting                   | `clamp`, `formatFileSize`                                                                                                        |
| [`string`](./docs/string.md)               | `@greypan/js-kit/string`        | Lowercased file extension extraction with edge-case validation              | `getFileExtension`                                                                                                               |
| [`utility-types`](./docs/utility-types.md) | `@greypan/js-kit/utility-types` | Zero-runtime TypeScript helper types                                        | `DeepPartial`, `DeepRequired`, `ValueOf`, `ArrayItem`, `ArgumentType`, `Equal`, `ClassPropertyTypes`                             |

## Usage notes

- **Queues and batching**: `defineBatchEmitter` merges rapid calls within `batchingDelay` and exposes `flush()` for immediate delivery. `defineQueue` marks an item done upon handoff, while `defineAckQueue` removes an item only after `onConsume` fulfills—failed items stay queued without blocking subsequent items and retry on `resume()` or `flush()`. Both queues accept a synchronous `onPersist` hook (persist-before-commit).
- **Relative URLs**: `parseUrl` and `stringifyUrl` handle full URLs, root-relative paths (`/api/items?page=1`), and protocol-relative URLs (`//cdn.example.com/a.js`) without throwing on a missing origin. `stringifyUrl` omits `null`/`undefined` query values by default (`omitNil = true`).
- **Timers**: `debounce(fn, options)` returns a controller object (`{ call, cancel, flush, isPending, cachedValue }`) supporting `waitMs`, `maxWaitMs`, and `timing` (`'trailing' | 'leading' | 'both'`). `defineControllableInterval` returns a plugin whose instance exposes `start()`, `pause()`, `resume()`, `stop()`, and `tick(delay)`, preserving remaining time across pauses.
- **Fire-and-forget calls**: `safeCall(fn, { onError })` catches both synchronous throws and rejected promises, and suppresses errors thrown inside `onError` itself—useful in cleanup hooks and event listeners.
- **Compile-time types**: Imports from `@greypan/js-kit/utility-types` emit zero runtime JavaScript.

> Looking for browser-specific helpers (storage, telemetry tracking, environment detection, DOM, files, clipboard, history)? See [`@greypan/browser-kit`](../browser-kit/README.md).

## License

MIT
