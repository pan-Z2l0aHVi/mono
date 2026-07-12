# Storage

Namespaced localStorage/sessionStorage with TTL and cross-tab sync

English | [简体中文](./README.CN.md)

## Overview

A plugin-based storage solution that wraps `localStorage` and `sessionStorage` with:

- **Namespace isolation**: Multiple apps can coexist without key conflicts
- **TTL expiry**: Keys auto-expire after a specified duration
- **Cross-tab sync**: `watch` listens to `storage` events for changes in other tabs
- **Quota handling**: Auto-cleans expired keys when storage is full

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

Create a namespaced storage instance. Returns a singleton per namespace.

| Parameter   | Type     | Default | Description              |
| ----------- | -------- | ------- | ------------------------ |
| `namespace` | `string` | `''`    | Storage namespace prefix |

```ts
import { defineLocal, defineSession } from '@greypan/browser-kit'

const local = defineLocal('my-app')
const session = defineSession('my-app')
```

### `local` / `session`

Default no-namespace singleton instances.

```ts
import { local, session } from '@greypan/browser-kit'

local.set('key', 'value')
session.set('temp', 'data')
```

### `storage.get(key, defaultValue?)`

Get a value by key. Returns `defaultValue` if key doesn't exist or has expired.

| Parameter      | Type        | Default | Description   |
| -------------- | ----------- | ------- | ------------- |
| `key`          | `string`    | -       | Storage key   |
| `defaultValue` | `T \| null` | `null`  | Default value |

### `storage.set(key, value, ttl?)`

Set a value. Pass `undefined` to remove the key.

| Parameter | Type     | Default | Description                  |
| --------- | -------- | ------- | ---------------------------- |
| `key`     | `string` | -       | Storage key                  |
| `value`   | `T`      | -       | Value to store               |
| `ttl`     | `number` | -       | Time-to-live in milliseconds |

```ts
storage.set('token', 'abc123', 3600_000) // Expires in 1 hour
storage.set('user', { name: 'Alice' }) // No expiry
storage.set('key', undefined) // Removes the key
```

### `storage.has(key)`

Check if a key exists and hasn't expired.

### `storage.remove(key)`

Remove a key.

### `storage.clear()`

Clear all keys with the current namespace.

### `storage.clearUseless()`

Remove all expired keys with the current namespace.

### `storage.watch(key, callback)`

Watch for changes to a key from other tabs. Returns an unwatch function.

| Parameter  | Type                                             | Default | Description          |
| ---------- | ------------------------------------------------ | ------- | -------------------- |
| `key`      | `string`                                         | -       | Storage key to watch |
| `callback` | `(newVal: T \| null, oldVal: T \| null) => void` | -       | Change handler       |

```ts
const unwatch = storage.watch('user', (newVal, oldVal) => {
  console.log('user changed from', oldVal, 'to', newVal)
})

// Later
unwatch()
```

## Notes

- Values are wrapped in a `Pkg` envelope: `{ m: '_pkg', v: value, t?: expiry }`
- Expired values are auto-removed on `get`
- `set` retries once on `QuotaExceededError` after cleaning expired keys
- Same namespace always returns the same instance (singleton pattern)
