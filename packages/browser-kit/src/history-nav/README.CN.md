# History navigation

> 跟踪当前文档会话内能否后退或前进。

[English](./README.md) | 简体中文

## 概述

浏览器没有可靠的方式直接询问是否可以后退或前进。本模块跟踪同文档导航，并暴露 Navigation API 的只读部分。

它记录 push、replace、后退、前进与地址栏导航。历史栈通过 `sessionStorage` 在刷新后保留。存储不可用时退化为内存栈。

公开 API 是 `canGoBack`、`canGoForward`、`currentEntry`、`entries()` 和 `currententrychange`。它不提供 `navigate`、`intercept` 或 `transition`，也不会发出 `reload` 导航类型。它不会向 `history.state` 写入元数据。

## API

### `defineHistoryNav(options?)`

创建单例。首次调用安装监听器，后续调用返回同一实例。`window` 不可用时返回空实现。

| 参数        | 类型     | 默认值          | 说明                                  |
| ----------- | -------- | --------------- | ------------------------------------- |
| `namespace` | `string` | `'history-nav'` | `sessionStorage` 键名前缀，用于隔离。 |

```ts
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app' })

if (nav.canGoBack) history.back()
if (nav.canGoForward) history.forward()
```

### `nav.canGoBack` / `nav.canGoForward`

当前文档会话内能否后退或前进。

### `nav.currentEntry`

当前条目，没有条目时为 `null`。

```ts
interface HistoryNavEntry {
  readonly id: string
  readonly key: string
  readonly index: number
  readonly url: string | null
  readonly sameDocument: boolean
  getState(): unknown
}
```

`id` 对每个条目唯一。`key` 在 replace 后保持不变。`sameDocument` 当前恒为 `true`。

### `nav.entries()`

返回当前会话的全部条目数组。

### `nav.onCurrentEntryChange(handler)`

订阅条目变更，返回取消订阅函数。

```ts
const off = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType) // 'push' | 'replace' | 'traverse'
  console.log('from:', event.from?.url)
})
```

### `nav.dispose()`

移除监听器并还原原来的 history 方法。用于在测试之间复位。

## 限制

- 两个连续的同 URL 条目在后退或前进时无法区分，栈索引不会移动。push 相同 URL 仍会创建 `id` 和 `key` 不同的独立条目。
- 永远不会发出 `reload` 导航类型。
- 只跟踪同文档导航。本模块加载前产生的条目不会被重建。
