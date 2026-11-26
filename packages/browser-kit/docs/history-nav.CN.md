---
title: 历史导航状态
---

# 历史导航状态

`defineHistoryNav(options?)` 以 Navigation API 只读子集的形式跟踪当前文档会话的前进/后退可用性（`canGoBack`、`canGoForward`、`currentEntry`、`entries()`、`onCurrentEntryChange()`）。它在旁路记录 `history.pushState` / `history.replaceState` 而不污染 `history.state`，并将栈快照持久化至 `sessionStorage`，调用 `dispose()` 可完整还原原生方法。

## 跟踪前进与后退状态

应用启动时调用一次（幂等单例），订阅 `onCurrentEntryChange` 观察导航变化。下方交互演示运行在独立 iframe 沙箱中，不会影响当前文档页的路由历史。

```ts demo=history-nav-sandbox
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app-nav' })

const unsubscribe = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType, {
    from: event.from?.url,
    current: nav.currentEntry?.url,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward
  })
})

history.pushState({ step: 1 }, '', '?step=1')
history.replaceState({ step: 2 }, '', '?step=2')

console.log(nav.entries().length)

unsubscribe()
nav.dispose()
```

```js
import { defineHistoryNav } from '@greypan/browser-kit'

const nav = defineHistoryNav({ namespace: 'my-app-nav' })

const unsubscribe = nav.onCurrentEntryChange(event => {
  console.log(event.navigationType, {
    from: event.from?.url,
    current: nav.currentEntry?.url,
    canGoBack: nav.canGoBack,
    canGoForward: nav.canGoForward
  })
})

history.pushState({ step: 1 }, '', '?step=1')
history.replaceState({ step: 2 }, '', '?step=2')

console.log(nav.entries().length)

unsubscribe()
nav.dispose()
```

## API

| 成员                       | 类型                      | 说明                                                                         |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `canGoBack`                | `boolean`                 | 历史栈中是否存在可后退条目                                                   |
| `canGoForward`             | `boolean`                 | 历史栈中是否存在可前进条目                                                   |
| `currentEntry`             | `HistoryNavEntry \| null` | 当前激活条目（含 `id`、`key`、`index`、`url`、`sameDocument`、`getState()`） |
| `entries()`                | `() => HistoryNavEntry[]` | 返回当前文档会话中的全部历史条目                                             |
| `onCurrentEntryChange(cb)` | `(cb) => () => void`      | 订阅 `push`、`replace`、`traverse` 状态变化                                  |
| `dispose()`                | `() => void`              | 移除事件监听、还原原生 `history` 方法并重置单例                              |
