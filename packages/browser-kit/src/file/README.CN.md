# File

文件下载、图片信息、base64 转换与文件类型比较

[English](./README.md) | 简体中文

## 概览

仅面向浏览器的文件工具，由 `@greypan/browser-kit` 重新导出。全部依赖 DOM API（`fetch`、`Blob`、`FileReader`、`Image`、`URL.createObjectURL`）。

## API

### `downloadFile(arg, filename?, onProgress?)`

触发浏览器下载，支持 `File`、`Blob` 或远程 URL。

| 参数         | 类型                        | 默认值 | 说明                                      |
| ------------ | --------------------------- | ------ | ----------------------------------------- |
| `arg`        | `File \| Blob \| string`    | -      | 文件、Blob 或绝对 URL                     |
| `filename`   | `string`                    | 自动   | 输出文件名；默认取 File 名或 URL 最后一段 |
| `onProgress` | `(percent: number) => void` | -      | 远程 URL 流式下载时回调（0–100）          |

```ts
import { downloadFile } from '@greypan/browser-kit'

await downloadFile('/api/report.pdf', 'report.pdf')
await downloadFile(file)
```

行为：

- 远程响应通过 `ReadableStream` 读取，进度按 `Content-Length` 计算；没有该响应头时不会触发进度回调。
- 响应非 OK 抛 `Download failed: <status> <statusText>`；fetch 失败抛 `Network error: failed to fetch the file.`；相对路径字符串在请求前抛 `Invalid URL: <arg>.`。
- 点击后延迟 100 ms 释放 blob URL 并移除临时 anchor，给浏览器留出开始下载的时间。

### `getImageInfo(source)`

获取图片的自然显示尺寸。

| 参数     | 类型                     | 默认值 | 说明                   |
| -------- | ------------------------ | ------ | ---------------------- |
| `source` | `File \| Blob \| string` | -      | 图片 File、Blob 或 URL |

**返回：** `Promise<{ width: number; height: number }>`。内部创建的 blob URL 在加载后释放。

### `isValidBase64(str)`

检查字符串是否为合法 base64。接受原始 base64 与 `data:` URL；空字符串、错误 padding 与非法字符返回 `false`。

### `base64ToFile(base64, filename?)`

把 base64 或 `data:` URL 转换为 `File`。

| 参数       | 类型     | 默认值   | 说明                                       |
| ---------- | -------- | -------- | ------------------------------------------ |
| `base64`   | `string` | -        | 原始 base64 或 `data:` URL                 |
| `filename` | `string` | `'file'` | 输出文件名；没有扩展名时按 MIME 类型补一个 |

校验失败抛 `Invalid base64 string.`。MIME 类型取自 `data:` 前缀，缺省为 `image/png`。

### `fileToBase64(file)`

把 `File` 或 `Blob` 读成 base64 `data:` URL。

**返回：** `Promise<string>`。

### `isSameFileType(...files)`

比较每个文件的前 8 字节（Magic Number），判断是否全部一致。只有一个文件或不传时返回 `true`；比较两个或更多文件时，空文件会以 `File is empty or invalid.` reject。

| 参数       | 类型     | 默认值 | 说明         |
| ---------- | -------- | ------ | ------------ |
| `...files` | `File[]` | -      | 待比较的文件 |

**返回：** `Promise<boolean>`。
