---
title: 事件简写
---

# 事件简写

`on` 与 `off` 是面向 `Window` 和 `Document` 的强类型 `addEventListener` / `removeEventListener` 封装，自动根据 `WindowEventMap` 与 `DocumentEventMap` 推导事件参数类型。

## 强类型全局事件监听

注册带完整事件类型推导的监听器，并在适当时机通过 `off`（或 `AbortSignal`）解绑。

```ts demo=event-shortcut
import { off, on } from '@greypan/browser-kit'

const handleKeydown = (event: KeyboardEvent) => {
  console.log('按下按键:', event.key)
}

on(window, 'keydown', handleKeydown)

// 不再需要时移除监听
off(window, 'keydown', handleKeydown)
```

```js
import { off, on } from '@greypan/browser-kit'

const handleKeydown = event => {
  console.log('按下按键:', event.key)
}

on(window, 'keydown', handleKeydown)

// 不再需要时移除监听
off(window, 'keydown', handleKeydown)
```

## API

| 函数  | 签名                                                             | 说明                                    |
| ----- | ---------------------------------------------------------------- | --------------------------------------- |
| `on`  | `(target: Window \| Document, type, listener, options?) => void` | 带类型推导的 `addEventListener` 封装    |
| `off` | `(target: Window \| Document, type, listener, options?) => void` | 带类型推导的 `removeEventListener` 封装 |
