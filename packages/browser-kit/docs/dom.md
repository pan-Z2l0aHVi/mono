---
title: DOM
---

# DOM

SSR-safe helpers for reading the current viewport dimensions and root document scroll offsets.

## Viewport size and root scroll offsets

`getViewportSize()`, `getRootScrollTop()`, and `getRootScrollLeft()` safely return zeros when `window` or `document` is unavailable.

```ts demo=dom-metrics
import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '@greypan/browser-kit'

const viewport = getViewportSize()
const scroll = {
  top: getRootScrollTop(),
  left: getRootScrollLeft()
}

console.log({ viewport, scroll })
```

```js
import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '@greypan/browser-kit'

const viewport = getViewportSize()
const scroll = {
  top: getRootScrollTop(),
  left: getRootScrollLeft()
}

console.log({ viewport, scroll })
```

## API

| Function              | Return type                         | Description                                                       |
| --------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `getViewportSize()`   | `{ width: number; height: number }` | Current `window.innerWidth` / `window.innerHeight` (zeros in SSR) |
| `getRootScrollTop()`  | `number`                            | Current vertical scroll offset of the root document               |
| `getRootScrollLeft()` | `number`                            | Current horizontal scroll offset of the root document             |
