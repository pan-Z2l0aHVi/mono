# @greypan/test-kit

> Test helpers for Vitest browser mode with MSW.

English | [简体中文](./README.CN.md)

## Internal use

This is private test infrastructure for this workspace. It is not published. Add it to a workspace package with the `workspace:*` protocol.

`msw` is a peer dependency.

## Quick start

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

Pass the promise that represents the whole operation, such as the return value of `fetch()` or a queue flush. `settle` cannot see work you do not pass to it. With fake timers, its timeout follows the fake clock.

Requests are captured automatically. The environment installs a catch-all handler that responds with `{ ok: true }`, so you do not need to write one. Handlers passed through `createMswTestEnv({ handlers })` take priority.

## Compose plugins directly

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

console.log(ctx.capturedRequests)

ctx.clearCapturedRequests()
await ctx.stopMsw()
```

## API

### `createMswTestEnv(options?)`

Create a complete MSW test environment with automatic request capture.

| Parameter  | Type               | Default | Description                                                          |
| ---------- | ------------------ | ------- | -------------------------------------------------------------------- |
| `handlers` | `RequestHandler[]` | `[]`    | Business handlers. They are registered before the recording handler. |

Returns an `MswTestEnv`.

| Property                | Type                                                                    | Description                                                                               |
| ----------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `worker`                | `SetupWorker`                                                           | MSW service worker instance.                                                              |
| `start`                 | `() => Promise<unknown>`                                                | Start the worker. Use with `beforeAll`.                                                   |
| `stop`                  | `() => void`                                                            | Stop the worker. Use with `afterAll`.                                                     |
| `reset`                 | `() => void`                                                            | Reset handlers to defaults. Use with `afterEach`.                                         |
| `capturedRequests`      | `CapturedRequest[]`                                                     | Requests captured by the built-in recorder. `url` is the URL pathname.                    |
| `clearCapturedRequests` | `() => void`                                                            | Clear captured requests.                                                                  |
| `settle`                | `(completion: PromiseLike<unknown>, timeout?: number) => Promise<void>` | Wait for the completion signal. Rejects on failure or timeout. Default timeout is 300 ms. |

### `defineMsw(handlers)`

Create an MSW lifecycle plugin.

| Parameter  | Type               | Description          |
| ---------- | ------------------ | -------------------- |
| `handlers` | `RequestHandler[]` | MSW request handlers |

Returns an `MswContext` with `worker`, `startMsw`, `stopMsw`, and `resetMsw`.

### `defineCapturedRequests()`

Create a request capture plugin.

Returns a `CapturedRequestsContext` with `capturedRequests` and `clearCapturedRequests`.

### `CapturedRequest`

| Property    | Type      | Description          |
| ----------- | --------- | -------------------- |
| `url`       | `string`  | Request URL pathname |
| `body`      | `unknown` | Request body         |
| `method`    | `string`  | HTTP method          |
| `timestamp` | `number`  | Capture timestamp    |
