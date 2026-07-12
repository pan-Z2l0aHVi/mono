# @greypan/test-kit

Test infrastructure plugins for Vitest browser mode with MSW

English | [简体中文](./README.CN.md)

## Features

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

> Requires `msw` as a peer dependency.

## Quick Start

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
