# Storage

带命名空间、TTL 和跨标签页同步的 localStorage/sessionStorage

[English](./README.md) | 简体中文

## 概述

基于插件的存储方案，封装 `localStorage` 和 `sessionStorage`，提供：

- **命名空间隔离**：多个应用共存无键名冲突
- **TTL 过期**：键在指定时间后自动过期
- **跨标签页同步**：`watch` 监听其他标签页的 `storage` 事件
- **配额处理**：存储满时自动清理过期键

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

创建带命名空间的存储实例。每个 namespace 返回单例。

| 参数        | 类型     | 默认值 | 说明             |
| ----------- | -------- | ------ | ---------------- |
| `namespace` | `string` | `''`   | 存储命名空间前缀 |

```ts
import { defineLocal, defineSession } from '@greypan/browser-kit'

const local = defineLocal('my-app')
const session = defineSession('my-app')
```

### `local` / `session`

默认无命名空间的单例实例。

```ts
import { local, session } from '@greypan/browser-kit'

local.set('key', 'value')
session.set('temp', 'data')
```

### `storage.get(key, defaultValue?)`

按键获取值。键不存在或已过期时返回 `defaultValue`。

| 参数           | 类型        | 默认值 | 说明     |
| -------------- | ----------- | ------ | -------- |
| `key`          | `string`    | -      | 存储键名 |
| `defaultValue` | `T \| null` | `null` | 默认值   |

### `storage.set(key, value, ttl?)`

设置值。传 `undefined` 会删除该键。

| 参数    | 类型     | 默认值 | 说明           |
| ------- | -------- | ------ | -------------- |
| `key`   | `string` | -      | 存储键名       |
| `value` | `T`      | -      | 待存储的值     |
| `ttl`   | `number` | -      | 有效期（毫秒） |

```ts
storage.set('token', 'abc123', 3600_000) // 1 小时后过期
storage.set('user', { name: 'Alice' }) // 永不过期
storage.set('key', undefined) // 删除该键
```

### `storage.has(key)`

检查键是否存在且未过期。

### `storage.remove(key)`

删除指定键。

### `storage.clear()`

清空当前命名空间下的所有键。

### `storage.clearUseless()`

清理当前命名空间下的所有过期键。

### `storage.watch(key, callback)`

监听其他标签页对指定键的变更。返回 unwatch 函数。

| 参数       | 类型                                             | 默认值 | 说明         |
| ---------- | ------------------------------------------------ | ------ | ------------ |
| `key`      | `string`                                         | -      | 待监听的键   |
| `callback` | `(newVal: T \| null, oldVal: T \| null) => void` | -      | 变更处理函数 |

```ts
const unwatch = storage.watch('user', (newVal, oldVal) => {
  console.log('user changed from', oldVal, 'to', newVal)
})

// 后续取消监听
unwatch()
```

## 注意事项

- 值被包装在 `Pkg` 信封中：`{ m: '_pkg', v: value, t?: expiry }`
- 过期值在 `get` 时自动删除
- `set` 遇到 `QuotaExceededError` 会清理过期键后重试一次
- 相同 namespace 始终返回同一实例（单例模式）
