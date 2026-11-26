---
title: History Nav
---

# History Nav

`defineHistoryNav(options?)` tracks browser session history as a read-only subset of the Navigation API (`canGoBack`, `canGoForward`, `currentEntry`, `entries()`, `onCurrentEntryChange()`). It patches `history.pushState` / `history.replaceState` without mutating `history.state`, persists snapshots to `sessionStorage`, and restores cleanly on `dispose()`.

## Tracking back/forward availability

Initialize once at app startup (idempotent singleton), subscribe to `onCurrentEntryChange`, and call `dispose()` if you need to restore native `history` methods. The interactive demo below runs in an isolated iframe so it never affects the host page history.

```ts demo=history-nav-sandbox
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app-nav' })

const unsubscribe = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType, {
    from: event.from?.url,
    current: nav.currentEntry?.url,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward
  })
})

history.pushState({ step: 1 }, '', '?step=1')
history.replaceState({ step: 2 }, '', '?step=2')

console.log(nav.entries().length)

unsubscribe()
nav.dispose()
```

```js
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app-nav' })

const unsubscribe = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType, {
    from: event.from?.url,
    current: nav.currentEntry?.url,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward
  })
})

history.pushState({ step: 1 }, '', '?step=1')
history.replaceState({ step: 2 }, '', '?step=2')

console.log(nav.entries().length)

unsubscribe()
nav.dispose()
```

## API

| Member                     | Type                      | Description                                                                 |
| -------------------------- | ------------------------- | --------------------------------------------------------------------------- |
| `canGoBack`                | `boolean`                 | Whether an earlier entry exists in the tracked stack                        |
| `canGoForward`             | `boolean`                 | Whether a forward entry exists in the tracked stack                         |
| `currentEntry`             | `HistoryNavEntry \| null` | Active entry (`id`, `key`, `index`, `url`, `sameDocument`, `getState()`)    |
| `entries()`                | `() => HistoryNavEntry[]` | Snapshot of all entries in the current document session                     |
| `onCurrentEntryChange(cb)` | `(cb) => () => void`      | Subscribe to `push`, `replace`, and `traverse` transitions                  |
| `dispose()`                | `() => void`              | Unregister listeners, restore native `history` methods, and clear singleton |
