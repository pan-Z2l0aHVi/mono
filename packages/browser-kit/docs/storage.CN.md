---
title: 存储
---

# 存储

`defineLocal(namespace?)` 与 `defineSession(namespace?)` 创建带命名空间隔离的 `localStorage` / `sessionStorage` 实例，支持 TTL 过期、配额溢出清理、受限存储静默降级，以及跨标签页 `watch()`。`local` 与 `session` 为无前缀默认实例。

## 带命名空间与 TTL 的存储

使用 `set(key, value, ttl?)` 持久化结构化数据并设置可选的毫秒级 TTL；过期条目在读取时会自动删除并返回默认值。

```ts demo=storage-ttl
import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get<{ name: string; role: string }>('profile')

// 5 秒后过期
store.set('otp', '482910', 5_000)

// 仅监听跨标签页变更（浏览器原生 storage 事件不会在同一标签页触发）
const unwatch = store.watch<string>('otp', (next, prev) => {
  console.log('跨标签页 otp 变更', { next, prev })
})

unwatch()
console.log(profile)
```

```js
import { defineLocal } from '@greypan/browser-kit'

const store = defineLocal('my-app')

store.set('profile', { name: 'Alice', role: 'admin' })
const profile = store.get('profile')

// 5 秒后过期
store.set('otp', '482910', 5_000)

// 仅监听跨标签页变更（浏览器原生 storage 事件不会在同一标签页触发）
const unwatch = store.watch('otp', (next, prev) => {
  console.log('跨标签页 otp 变更', { next, prev })
})

unwatch()
console.log(profile)
```

## API

| 方法                            | 签名                                                                             | 说明                                                 |
| ------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `defineLocal` / `defineSession` | `(namespace?: string) => StorageInst`                                            | 按命名空间返回缓存单例                               |
| `local` / `session`             | `StorageInst`                                                                    | 无命名空间前缀的默认实例                             |
| `set`                           | `<T>(key: string, val: T, ttl?: number) => boolean`                              | 写入数据与可选毫秒级 TTL；受限存储降级时返回 `false` |
| `get`                           | `<T>(key: string, def?: T \| null) => T \| null`                                 | 读取数据，不存在或过期时返回 `def`                   |
| `has`                           | `(key: string) => boolean`                                                       | 检查键是否存在且未过期                               |
| `remove`                        | `(key: string) => boolean`                                                       | 删除指定键                                           |
| `clearUseless`                  | `() => void`                                                                     | 清理当前命名空间下已过期的键                         |
| `clear`                         | `() => void`                                                                     | 清空当前命名空间（无前缀时清空整个存储）             |
| `watch`                         | `<T>(key: string, cb: (next: T \| null, prev: T \| null) => void) => () => void` | 监听跨标签页 `storage` 变更                          |
