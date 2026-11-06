# Storage

> Namespaced localStorage and sessionStorage with TTL and cross-tab change events.

English | [简体中文](./README.CN.md)

## Overview

`@greypan/browser-kit` storage instances wrap the browser storage APIs with four additions:

- A namespace prefix so multiple apps can share one origin without key conflicts.
- Optional TTL expiry.
- `watch` events for changes made in other tabs.
- Automatic removal of expired keys when storage is full.

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

Create a namespaced storage instance. The same namespace always returns the same instance.

| Parameter   | Type     | Default | Description              |
| ----------- | -------- | ------- | ------------------------ |
| `namespace` | `string` | `''`    | Storage namespace prefix |

```ts
import { defineLocal, defineSession } from '@greypan/browser-kit'

const local = defineLocal('my-app')
const session = defineSession('my-app')
```

### `local` / `session`

Default instances without a namespace.

```ts
import { local, session } from '@greypan/browser-kit'

local.set('key', 'value')
session.set('temp', 'data')
```

### `storage.get(key, defaultValue?)`

Return a value. Returns `defaultValue` when the key is missing or expired.

| Parameter      | Type        | Default | Description   |
| -------------- | ----------- | ------- | ------------- |
| `key`          | `string`    | -       | Storage key   |
| `defaultValue` | `T \| null` | `null`  | Default value |

### `storage.set(key, value, ttl?)`

Store a value. Pass `undefined` as the value to remove the key. Returns `true` when the write succeeds and `false` when restricted storage is unavailable. It does not throw for restricted storage.

| Parameter | Type     | Default | Description                  |
| --------- | -------- | ------- | ---------------------------- |
| `key`     | `string` | -       | Storage key                  |
| `value`   | `T`      | -       | Value to store               |
| `ttl`     | `number` | -       | Time to live in milliseconds |

```ts
storage.set('token', 'abc123', 3600_000) // Expires in one hour
storage.set('user', { name: 'Alice' }) // No expiry
storage.set('key', undefined) // Remove the key
```

### `storage.has(key)`

Return whether a key exists and has not expired.

### `storage.remove(key)`

Remove a key. Returns `true` on success and `false` when restricted storage is unavailable.

### `storage.clear()`

Remove all keys in the current namespace.

### `storage.clearUseless()`

Remove all expired keys in the current namespace.

### `storage.watch(key, callback)`

Listen for changes to a key made in other tabs. Returns an unwatch function.

| Parameter  | Type                                             | Description          |
| ---------- | ------------------------------------------------ | -------------------- |
| `key`      | `string`                                         | Storage key to watch |
| `callback` | `(newVal: T \| null, oldVal: T \| null) => void` | Change handler       |

```ts
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed from', oldValue, 'to', newValue)
})

unwatch()
```

## Notes

- `get` removes an expired value when it reads it.
- If a write exceeds the storage quota, expired keys are cleared and the write is retried once.
