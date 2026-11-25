# shortcut

English | [简体中文](./shortcut.CN.md)

Provides `safeCall` for fire-and-forget synchronous or asynchronous invocations that must never leak uncaught errors or unhandled promise rejections.

## Examples

### Safe fire-and-forget execution

```ts demo=safe-call
import { safeCall } from '@greypan/js-kit'

safeCall(
  () => {
    throw new Error('sync boom')
  },
  {
    onError: error => console.warn('Captured:', error)
  }
)

safeCall(async () => Promise.reject(new Error('async boom')), {
  onError: error => console.warn('Captured async:', error)
})
```

```js
import { safeCall } from '@greypan/js-kit'

safeCall(
  () => {
    throw new Error('sync boom')
  },
  {
    onError: error => console.warn('Captured:', error)
  }
)

safeCall(async () => Promise.reject(new Error('async boom')), {
  onError: error => console.warn('Captured async:', error)
})
```

## API

| Function   | Signature                                                | Description                                                                                                             |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `safeCall` | `(fn: () => unknown, options?: SafeCallOptions) => void` | Invokes `fn` and catches both synchronous throws and async rejections, optionally forwarding them to `options.onError`. |
