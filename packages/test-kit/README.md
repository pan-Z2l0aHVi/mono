# @greypan/test-kit

> Test infrastructure plugins for Vitest browser mode with MSW

English | [简体中文](./README.CN.md)

## Features

- **MSW test env**: One `createMswTestEnv()` call wires the worker lifecycle, automatic request capture, and in-flight settle
- **MSW lifecycle**: Start/stop/reset Mock Service Worker with plugin composition
- **Request capture**: Record and assert intercepted HTTP requests
- **Plugin composition**: Built on js-kit's plugin system for composable test infrastructure

## Install

```bash
# npm
npm install @greypan/test-kit

# pnpm
pnpm add @greypan/test-kit

# yarn
yarn add @greypan/test-kit

# bun
bun add @greypan/test-kit
```

> Requires `msw` as a peer dependency. `settle` also uses the Vitest APIs re-exported by `vite-plus/test`.

## Quick Start

```ts
import { createMswTestEnv } from '@greypan/test-kit'
import { afterAll, afterEach, beforeAll, expect, it } from 'vite-plus/test'

const env = createMswTestEnv()

beforeAll(env.start)
afterEach(() => {
  env.reset()
  env.clearCapturedRequests()
})
afterAll(env.stop)

it('tracks a request', async () => {
  doTracking({ event: 'page_view' }) // fire-and-forget POST

  await env.settle() // waits until in-flight requests have landed

  expect(env.capturedRequests).toHaveLength(1)
  expect(env.capturedRequests[0].url).toBe('/api/track')
})
```

Captured requests fill automatically: the env installs its own catch-all recording handler (it responds `{ ok: true }`), so there is no need to hand-write one. Requests handled by custom handlers take precedence over the recorder; pass them via `createMswTestEnv({ handlers })`.

### Composing plugins directly

```ts
import { defineMsw, defineCapturedRequests } from '@greypan/test-kit'
import { http, HttpResponse } from 'msw'

const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({ name: 'Alice' })
  })
]

const capture = defineCapturedRequests()
const ctx = defineMsw(handlers).use(capture).make()

await ctx.startMsw()

// ... run your test ...

console.log(ctx.capturedRequests) // [{ url: '/api/user', body: ..., method: 'GET', timestamp: ... }]

ctx.clearCapturedRequests()
await ctx.stopMsw()
```

## API

### `createMswTestEnv(options?)`

Create a complete MSW test environment with automatic request capture.

| Parameter  | Type               | Default | Description                                                                                          |
| ---------- | ------------------ | ------- | ---------------------------------------------------------------------------------------------------- |
| `handlers` | `RequestHandler[]` | `[]`    | Business handlers, registered before the built-in recording handler so their responses take priority |

**Returns:** `MswTestEnv` with:

| Property                | Type                            | Description                                                                                         |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------- |
| `worker`                | `SetupWorker`                   | MSW service worker instance                                                                         |
| `start`                 | `() => Promise<unknown>`        | Start the service worker (`beforeAll(env.start)`)                                                   |
| `stop`                  | `() => void`                    | Stop the service worker (`afterAll(env.stop)`)                                                      |
| `reset`                 | `() => void`                    | Reset handlers to defaults (`afterEach`)                                                            |
| `capturedRequests`      | `CapturedRequest[]`             | Requests captured by the built-in recorder; `url` is the request URL pathname                       |
| `clearCapturedRequests` | `() => void`                    | Clear all captured requests                                                                         |
| `settle`                | `(timeout?: number) => Promise` | Drain in-flight requests (stable window of ~60 ms, default `timeout` 300 ms). Preserves fake timers |

### `defineMsw(handlers)`

Create an MSW lifecycle plugin. Returns a plugin with worker management methods.

| Parameter  | Type               | Default | Description          |
| ---------- | ------------------ | ------- | -------------------- |
| `handlers` | `RequestHandler[]` | -       | MSW request handlers |

**Returns:** `MswContext` with:

| Property   | Type                  | Description                    |
| ---------- | --------------------- | ------------------------------ |
| `worker`   | `SetupWorker`         | MSW service worker instance    |
| `startMsw` | `() => Promise<void>` | Start the service worker       |
| `stopMsw`  | `() => void`          | Stop the service worker        |
| `resetMsw` | `() => void`          | Reset all handlers to defaults |

### `defineCapturedRequests()`

Create a request capture plugin. Records intercepted HTTP requests.

**Returns:** `CapturedRequestsContext` with:

| Property                | Type                | Description                 |
| ----------------------- | ------------------- | --------------------------- |
| `capturedRequests`      | `CapturedRequest[]` | Array of captured requests  |
| `clearCapturedRequests` | `() => void`        | Clear all captured requests |

### `CapturedRequest`

Type for a captured request.

| Property    | Type      | Description          |
| ----------- | --------- | -------------------- |
| `url`       | `string`  | Request URL pathname |
| `body`      | `unknown` | Request body         |
| `method`    | `string`  | HTTP method          |
| `timestamp` | `number`  | Capture timestamp    |
