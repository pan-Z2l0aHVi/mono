# shortcut

[English](./shortcut.md) | 简体中文

提供 `safeCall` 封装，用于不会向调用方泄漏同步异常或未捕获 Promise rejection 的 fire-and-forget 调用。

## 示例

### 安全执行同步与异步函数

```ts demo=safe-call
import { safeCall } from '@greypan/js-kit'

safeCall(
  () => {
    throw new Error('sync boom')
  },
  {
    onError: error => console.warn('Captured:', error)
  }
)

safeCall(async () => Promise.reject(new Error('async boom')), {
  onError: error => console.warn('Captured async:', error)
})
```

```js
import { safeCall } from '@greypan/js-kit'

safeCall(
  () => {
    throw new Error('sync boom')
  },
  {
    onError: error => console.warn('Captured:', error)
  }
)

safeCall(async () => Promise.reject(new Error('async boom')), {
  onError: error => console.warn('Captured async:', error)
})
```

## API

| 函数       | 签名                                                     | 说明                                                                                |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `safeCall` | `(fn: () => unknown, options?: SafeCallOptions) => void` | 执行 `fn` 并兜底捕获同步抛错与异步 rejection，可选通过 `options.onError` 接收错误。 |
