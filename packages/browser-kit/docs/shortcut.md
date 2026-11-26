---
title: Event Shortcut
---

# Event Shortcut

`on` and `off` are thin, strongly-typed wrappers around `addEventListener` and `removeEventListener` for `Window` and `Document`, inferring the exact event type from `WindowEventMap` and `DocumentEventMap`.

## Typed global event listeners

Attach listeners with full event type inference and clean them up with `off` (or an `AbortSignal`).

```ts demo=event-shortcut
import { off, on } from '@greypan/browser-kit'

const handleKeydown = (event: KeyboardEvent) => {
  console.log('key pressed:', event.key)
}

on(window, 'keydown', handleKeydown)

// Detach when no longer needed
off(window, 'keydown', handleKeydown)
```

```js
import { off, on } from '@greypan/browser-kit'

const handleKeydown = event => {
  console.log('key pressed:', event.key)
}

on(window, 'keydown', handleKeydown)

// Detach when no longer needed
off(window, 'keydown', handleKeydown)
```

## API

| Function | Signature                                                        | Description                         |
| -------- | ---------------------------------------------------------------- | ----------------------------------- |
| `on`     | `(target: Window \| Document, type, listener, options?) => void` | Typed `addEventListener` wrapper    |
| `off`    | `(target: Window \| Document, type, listener, options?) => void` | Typed `removeEventListener` wrapper |
