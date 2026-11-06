# Storage

> 带命名空间、TTL 与跨 tab 变更事件的 localStorage 和 sessionStorage。

[English](./README.md) | 简体中文

## 概述

`@greypan/browser-kit` 的存储实例封装浏览器存储 API，并增加四项能力：

- 命名空间前缀，让同一 origin 下的多个应用不冲突。
- 可选的 TTL 过期。
- 用 `watch` 监听其他 tab 的变更。
- 存储已满时自动清理过期键。

## API

### `defineLocal(namespace?)` / `defineSession(namespace?)`

创建带命名空间的存储实例。相同 namespace 始终返回同一实例。

| 参数        | 类型     | 默认值 | 说明             |
| ----------- | -------- | ------ | ---------------- |
| `namespace` | `string` | `''`   | 存储命名空间前缀 |

```ts
import { defineLocal, defineSession } from '@greypan/browser-kit'

const local = defineLocal('my-app')
const session = defineSession('my-app')
```

### `local` / `session`

不带命名空间的默认实例。

```ts
import { local, session } from '@greypan/browser-kit'

local.set('key', 'value')
session.set('temp', 'data')
```

### `storage.get(key, defaultValue?)`

读取值。键不存在或已过期时返回 `defaultValue`。

| 参数           | 类型        | 默认值 | 说明     |
| -------------- | ----------- | ------ | -------- |
| `key`          | `string`    | -      | 存储键名 |
| `defaultValue` | `T \| null` | `null` | 默认值   |

### `storage.set(key, value, ttl?)`

写入值。值传 `undefined` 会删除该键。写入成功返回 `true`，受限存储不可用时返回 `false`，不会抛错。

| 参数    | 类型     | 默认值 | 说明               |
| ------- | -------- | ------ | ------------------ |
| `key`   | `string` | -      | 存储键名           |
| `value` | `T`      | -      | 待存储的值         |
| `ttl`   | `number` | -      | 有效期，单位为毫秒 |

```ts
storage.set('token', 'abc123', 3600_000) // 一小时后过期
storage.set('user', { name: 'Alice' }) // 不过期
storage.set('key', undefined) // 删除该键
```

### `storage.has(key)`

返回键是否存在且未过期。

### `storage.remove(key)`

删除键。成功返回 `true`，受限存储不可用时返回 `false`。

### `storage.clear()`

删除当前命名空间下的所有键。

### `storage.clearUseless()`

删除当前命名空间下的所有过期键。

### `storage.watch(key, callback)`

监听其他 tab 对指定键的变更。返回取消监听函数。

| 参数       | 类型                                             | 说明         |
| ---------- | ------------------------------------------------ | ------------ |
| `key`      | `string`                                         | 待监听的键   |
| `callback` | `(newVal: T \| null, oldVal: T \| null) => void` | 变更处理函数 |

```ts
const unwatch = storage.watch('user', (newValue, oldValue) => {
  console.log('user changed from', oldValue, 'to', newValue)
})

unwatch()
```

## 说明

- `get` 读到过期值时会同时删除它。
- 写入超出存储配额时，会清理过期键并重试一次。
