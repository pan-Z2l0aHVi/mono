# copy

[English](./copy.md) | 简体中文

跨浏览器剪贴板复制工具，支持纯文本与 `Blob` 输入，内置完整降级链。

## 示例

### 复制文本或 Blob

```ts demo=copy-text
import { copyToClipboard } from '@greypan/browser-kit'

await copyToClipboard('Hello from @greypan/browser-kit')
await copyToClipboard(new Blob(['<b>Hi</b>'], { type: 'text/html' }))
```

```js
import { copyToClipboard } from '@greypan/browser-kit'

await copyToClipboard('Hello from @greypan/browser-kit')
await copyToClipboard(new Blob(['<b>Hi</b>'], { type: 'text/html' }))
```

## API

| 函数              | 签名                                                                | 说明                             |
| ----------------- | ------------------------------------------------------------------- | -------------------------------- |
| `copyToClipboard` | `(content: string \| Blob, options?: CopyOptions) => Promise<void>` | 将文本或 `Blob` 写入系统剪贴板。 |

| 选项     | 类型      | 默认值         | 说明                                                           |
| -------- | --------- | -------------- | -------------------------------------------------------------- |
| `format` | `string`  | `'text/plain'` | 剪贴板 MIME 类型（传入 `Blob` 且未指定时自动取 `Blob.type`）。 |
| `debug`  | `boolean` | `false`        | 开启后在控制台输出复制失败诊断信息。                           |
