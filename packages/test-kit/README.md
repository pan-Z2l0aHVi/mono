# @greypan/test-kit

> Test infrastructure plugins for Vitest browser mode with MSW

English | [简体中文](https://github.com/pan-Z2l0aHVi/mono/blob/main/packages/test-kit/README.CN.md)

## Features

- **MSW test env**: One `createMswTestEnv()` call wires the worker lifecycle, automatic request capture, and completion tracking
- **MSW lifecycle**: Start/stop/reset Mock Service Worker with plugin composition
- **Request capture**: Record and assert intercepted HTTP requests
- **Plugin composition**: Built on js-kit's plugin system for composable test infrastructure

## Internal use

This is private test infrastructure for the `mono` workspace and is not published by this repository. Add it to an in-repository package with the `workspace:*` protocol.

> Requires `msw` as a peer dependency.

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
  const completion = fetch('/api/track', { method: 'POST', body: JSON.stringify({ event: 'page_view' }) })
  await env.settle(completion)

  expect(env.capturedRequests).toHaveLength(1)
  expect(env.capturedRequests[0].url).toBe('/api/track')
})
```

Pass the promise that represents the entire operation, such as the return value of `fetch()` or a queue flush. `settle` cannot detect work that the caller does not provide. With fake timers, its timeout advances with the fake clock.

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

| Property                | Type                                                                    | Description                                                                                       |
| ----------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `worker`                | `SetupWorker`                                                           | MSW service worker instance                                                                       |
| `start`                 | `() => Promise<unknown>`                                                | Start the service worker (`beforeAll(env.start)`)                                                 |
| `stop`                  | `() => void`                                                            | Stop the service worker (`afterAll(env.stop)`)                                                    |
| `reset`                 | `() => void`                                                            | Reset handlers to defaults (`afterEach`)                                                          |
| `capturedRequests`      | `CapturedRequest[]`                                                     | Requests captured by the built-in recorder; `url` is the request URL pathname                     |
| `clearCapturedRequests` | `() => void`                                                            | Clear all captured requests                                                                       |
| `settle`                | `(completion: PromiseLike<unknown>, timeout?: number) => Promise<void>` | Await the supplied completion signal; reject if it fails or exceeds the timeout (default 300 ms). |

### `defineMsw(handlers)`

Create an MSW lifecycle plugin. Returns a plugin with worker management methods.

| Parameter  | Type               | Default | Description          |
| ---------- | ------------------ | ------- | -------------------- |
| `handlers` | `RequestHandler[]` | -       | MSW request handlers |

**Returns:** `MswContext` with:

| Property   | Type                     | Description                    |
| ---------- | ------------------------ | ------------------------------ |
| `worker`   | `SetupWorker`            | MSW service worker instance    |
| `startMsw` | `() => Promise<unknown>` | Start the service worker       |
| `stopMsw`  | `() => void`             | Stop the service worker        |
| `resetMsw` | `() => void`             | Reset all handlers to defaults |

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
