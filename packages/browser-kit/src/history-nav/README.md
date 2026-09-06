# History Nav

Track whether the user can go back / forward in the real browser history, exposing a read-only subset of the Navigation API

English | [简体中文](./README.CN.md)

## Overview

`vue-router` only maintains `history.state.back/forward` when `router.push()` is called; entries created by address-bar input or browser back/forward clone the previous state, so `back/forward` are always `null` and cannot tell whether navigation is possible. This module tracks the browser history position itself with an **entry stack + current index**:

- Patches `history.pushState` / `history.replaceState` globally, but only records in a side table — **never injects metadata into `history.state`**
- Handles browser back/forward and address-bar navigation via `popstate`, locating the target URL inside the stack
- Persists through `sessionStorage` (reusing the `storage` module) so the stack survives reloads
- Degrades silently to an in-memory stack when storage is blocked (private mode, restricted webview)

The public API only promises the **read-only subset** of the Navigation API: `canGoBack` / `canGoForward` / `currentEntry` / `entries()` / `currententrychange`. `navigate` / `intercept` / `transition` are out of scope; the `'reload'` navigation type is not emitted (it cannot be detected reliably).

## API

### `defineHistoryNav(options?)`

Create the history-nav singleton. **Idempotent**: the first call installs the patch and initial stack; later calls return the same instance. Returns a no-op instance when `window` is unavailable (SSR / Node).

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

Whether the user can navigate backwards / forwards within this document session.

### `nav.currentEntry`

The current `HistoryNavEntry` (`null` before any entry exists):

```ts
interface HistoryNavEntry {
  readonly id: string // unique per entry
  readonly key: string // stable across replace
  readonly index: number // position in the stack
  readonly url: string | null
  readonly sameDocument: true // always true: only same-document navigation is tracked
  getState(): unknown // deep clone of the captured history.state
}
```

### `nav.entries()`

All history entries in the current session as an array.

### `nav.onCurrentEntryChange(handler)`

Subscribe to entry changes. Returns an unsubscribe function.

```ts
const off = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType) // 'push' | 'replace' | 'traverse'
  console.log('from:', event.from?.url)
})
```

### `nav.dispose()`

Restore the patched `history` methods and remove listeners. Mainly used to reset between tests.

## Known Limitations

- **Same-URL consecutive entries**: because we do not inject metadata into `history.state`, a back/forward traversal between two entries with identical URLs cannot be distinguished by URL alone (the index does not move). This is a deliberate trade-off of the no-injection design; identical-URL pushes still create distinct entries with distinct `id`/`key`.
- **Reload detection**: the `'reload'` navigation type is never emitted.
- **Same-document only**: only same-document navigation is tracked (see the glossary: 同文档导航). Entries created before this module loads are not reconstructed.
