---
title: DOM 工具
---

# DOM 工具

提供 SSR 安全的视口尺寸与根文档滚动位置读取函数。

## 视口尺寸与根文档滚动偏移

`getViewportSize()`、`getRootScrollTop()` 与 `getRootScrollLeft()` 在无 `window` 或 `document` 环境下均安全返回 `0`。

```ts demo=dom-metrics
import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '@greypan/browser-kit'

const viewport = getViewportSize()
const scroll = {
  top: getRootScrollTop(),
  left: getRootScrollLeft()
}

console.log({ viewport, scroll })
```

```js
import { getRootScrollLeft, getRootScrollTop, getViewportSize } from '@greypan/browser-kit'

const viewport = getViewportSize()
const scroll = {
  top: getRootScrollTop(),
  left: getRootScrollLeft()
}

console.log({ viewport, scroll })
```

## API

| 函数                  | 返回值                              | 说明                                                 |
| --------------------- | ----------------------------------- | ---------------------------------------------------- |
| `getViewportSize()`   | `{ width: number; height: number }` | 当前视口宽高（SSR 下返回 `{ width: 0, height: 0 }`） |
| `getRootScrollTop()`  | `number`                            | 根文档纵向滚动偏移量                                 |
| `getRootScrollLeft()` | `number`                            | 根文档横向滚动偏移量                                 |
