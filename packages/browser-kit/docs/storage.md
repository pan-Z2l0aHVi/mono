---
title: Storage
---

# Storage

`defineLocal(namespace?)` and `defineSession(namespace?)` create namespaced `localStorage` and `sessionStorage` helpers with TTL expiration, quota cleanup, graceful degradation on restricted storage, and cross-tab `watch()`. `local` and `session` are default unprefixed instances.

## Namespaced storage with TTL

Use `set(key, value, ttl?)` to persist structured JSON values with an optional millisecond TTL. Expired entries return the default value and are removed automatically on read.

```ts demo=storage-ttl
import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get<{ name: string; role: string }>('profile')

// Expires in 5 seconds
store.set('otp', '482910', 5_000)

// Cross-tab updates only (native storage event does not fire in the same tab)
const unwatch = store.watch<string>('otp', (next, prev) => {
  console.log('otp changed across tabs', { next, prev })
})

unwatch()
console.log(profile)
```

```js
import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get('profile')

// Expires in 5 seconds
store.set('otp', '482910', 5_000)

// Cross-tab updates only (native storage event does not fire in the same tab)
const unwatch = store.watch('otp', (next, prev) => {
  console.log('otp changed across tabs', { next, prev })
})

unwatch()
console.log(profile)
```

## API

| Method                          | Signature                                                                        | Description                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `defineLocal` / `defineSession` | `(namespace?: string) => StorageInst`                                            | Return a cached singleton storage instance for the given namespace           |
| `local` / `session`             | `StorageInst`                                                                    | Default instances without a namespace prefix                                 |
| `set`                           | `<T>(key: string, val: T, ttl?: number) => boolean`                              | Store a value with optional TTL in ms; returns `false` on restricted storage |
| `get`                           | `<T>(key: string, def?: T \| null) => T \| null`                                 | Read value or return `def` when missing/expired                              |
| `has`                           | `(key: string) => boolean`                                                       | Check whether a non-expired value exists                                     |
| `remove`                        | `(key: string) => boolean`                                                       | Remove a single key                                                          |
| `clearUseless`                  | `() => void`                                                                     | Sweep expired keys within the current namespace                              |
| `clear`                         | `() => void`                                                                     | Clear all keys in the current namespace (or entire store when unprefixed)    |
| `watch`                         | `<T>(key: string, cb: (next: T \| null, prev: T \| null) => void) => () => void` | Listen for cross-tab `storage` events on the key                             |
