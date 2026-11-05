# History navigation

> Track whether the user can go back or forward in the current document session.

English | [简体中文](./README.CN.md)

## Overview

Browsers do not expose a reliable way to ask whether back or forward navigation is available. This module tracks same-document navigation and exposes the read-only part of the Navigation API.

It records push, replace, back, forward, and address-bar navigation. The history stack survives a reload through `sessionStorage`. When storage is unavailable, it falls back to an in-memory stack.

The public API is `canGoBack`, `canGoForward`, `currentEntry`, `entries()`, and `currententrychange`. It does not provide `navigate`, `intercept`, or `transition`, and it does not emit a `reload` navigation type. It does not write metadata into `history.state`.

## API

### `defineHistoryNav(options?)`

Create the singleton. The first call installs the listeners and later calls return the same instance. Returns a no-op instance when `window` is unavailable.

| Parameter   | Type     | Default         | Description                               |
| ----------- | -------- | --------------- | ----------------------------------------- |
| `namespace` | `string` | `'history-nav'` | `sessionStorage` key prefix for isolation |

```ts
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app' })

if (nav.canGoBack) history.back()
if (nav.canGoForward) history.forward()
```

### `nav.canGoBack` / `nav.canGoForward`

Whether the user can go back or forward within the current document session.

### `nav.currentEntry`

The current entry, or `null` before any entry exists.

```ts
interface HistoryNavEntry {
  readonly id: string
  readonly key: string
  readonly index: number
  readonly url: string | null
  readonly sameDocument: boolean
  getState(): unknown
}
```

`id` is unique per entry. `key` stays the same across a replace. `sameDocument` is currently always `true`.

### `nav.entries()`

Return all entries in the current session as an array.

### `nav.onCurrentEntryChange(handler)`

Subscribe to entry changes. Returns an unsubscribe function.

```ts
const off = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType) // 'push' | 'replace' | 'traverse'
  console.log('from:', event.from?.url)
})
```

### `nav.dispose()`

Remove listeners and restore the original history methods. Use it to reset between tests.

## Limits

- Two consecutive entries with the same URL cannot be told apart during back or forward. The stack does not move. Pushing the same URL still creates separate entries with different `id` and `key` values.
- The `reload` navigation type is never emitted.
- Only same-document navigation is tracked. Entries created before this module loads are not reconstructed.
