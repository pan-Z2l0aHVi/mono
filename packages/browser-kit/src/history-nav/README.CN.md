# History Nav

基于真实浏览器历史跟踪「能否后退/前进」，暴露 Navigation API 的只读子集

[English](./README.md) | 简体中文

## 概述

`vue-router` 只在 `router.push()` 时维护 `history.state.back/forward`；地址栏输入、浏览器前进/后退创建的 entry 会克隆旧 state，导致 `back/forward` 恒为 `null`，无法用来判断能否后退/前进。本模块以 **entry 栈 + 当前索引** 自行跟踪浏览器历史位置：

- 全局 patch `history.pushState` / `history.replaceState`，但只在旁路记录，**不向 `history.state` 注入任何元数据**
- 通过 `popstate` 处理浏览器前进/后退与地址栏导航，在栈内按 URL 定位
- 复用 `storage` 模块经 `sessionStorage` 持久化，刷新后仍能恢复
- 存储被禁（隐私模式、受限 webview）时静默降级为内存栈

公共 API 只承诺 Navigation API 的**只读子集**：`canGoBack` / `canGoForward` / `currentEntry` / `entries()` / `currententrychange`。`navigate` / `intercept` / `transition` 不在承诺范围；`'reload'` 导航类型不发出（无法可靠检测）。

## API

### `defineHistoryNav(options?)`

创建 history-nav 单例。**幂等**：首次调用安装 patch 与初始栈，后续调用返回同一实例。无 `window`（SSR / Node）时返回 no-op 实例。

| 参数        | 类型     | 默认值          | 说明                                |
| ----------- | -------- | --------------- | ----------------------------------- |
| `namespace` | `string` | `'history-nav'` | `sessionStorage` 键名前缀，用于隔离 |

```ts
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app' })

if (nav.canGoBack) history.back()
if (nav.canGoForward) history.forward()
```

### `nav.canGoBack` / `nav.canGoForward`

当前同文档会话内能否后退 / 前进。

### `nav.currentEntry`

当前 `HistoryNavEntry`（无条目时为 `null`）：

```ts
interface HistoryNavEntry {
  readonly id: string // 每条唯一
  readonly key: string // replace 后保持不变
  readonly index: number // 栈内位置
  readonly url: string | null
  readonly sameDocument: true // 恒为 true：只跟踪同文档导航
  getState(): unknown // 捕获的 history.state 深克隆
}
```

### `nav.entries()`

当前会话的全部历史条目数组。

### `nav.onCurrentEntryChange(handler)`

订阅条目变更，返回取消订阅函数。

```ts
const off = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType) // 'push' | 'replace' | 'traverse'
  console.log('from:', event.from?.url)
})
```

### `nav.dispose()`

还原被 patch 的 `history` 方法并移除监听。主要用于测试间复位。

## 已知局限

- **同 URL 连续条目**：由于不向 `history.state` 注入元数据，两个 URL 完全相同的条目之间前进/后退无法仅凭 URL 区分（索引不会移动）。这是「不注入」设计的刻意取舍；相同 URL 的 push 仍会生成 `id`/`key` 不同的独立条目。
- **刷新检测**：`'reload'` 导航类型永不发出。
- **仅同文档**：只跟踪同文档导航（见术语「同文档导航」）；本模块加载前产生的历史条目不会重建。
