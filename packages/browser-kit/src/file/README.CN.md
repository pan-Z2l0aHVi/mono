# File

> 下载文件、读取图片信息、转换 base64 与比较文件类型。

[English](./README.md) | 简体中文

## 概述

仅用于浏览器的文件工具，由 `@greypan/browser-kit` 重新导出。它们使用 `fetch`、`Blob`、`FileReader`、`Image` 和 object URL。

## API

### `downloadFile(arg, filename?, onProgress?)`

下载 `File`、`Blob` 或远程 URL。

| 参数         | 类型                        | 默认值 | 说明                                        |
| ------------ | --------------------------- | ------ | ------------------------------------------- |
| `arg`        | `File \| Blob \| string`    | -      | 文件、Blob 或绝对 URL                       |
| `filename`   | `string`                    | 自动   | 输出文件名，默认取 File 名或 URL 最后一段。 |
| `onProgress` | `(percent: number) => void` | -      | 远程 URL 的下载进度，范围 0 到 100。        |

```ts
import { downloadFile } from '@greypan/browser-kit'

await downloadFile('/api/report.pdf', 'report.pdf')
await downloadFile(file)
```

远程进度需要响应头包含 `Content-Length`，没有该响应头时不会触发进度回调。响应失败抛 `Download failed: <status> <statusText>`，网络失败抛 `Network error: failed to fetch the file.`，相对 URL 字符串在请求前抛 `Invalid URL: <arg>.`。

### `getImageInfo(source)`

返回图片宽高。

| 参数     | 类型                     | 说明                   |
| -------- | ------------------------ | ---------------------- |
| `source` | `File \| Blob \| string` | 图片 File、Blob 或 URL |

返回 `Promise<{ width: number; height: number }>`。

### `isValidBase64(str)`

检查字符串是否为有效 base64。原始 base64 与 `data:` URL 都接受。空字符串、错误 padding 与非法字符返回 `false`。

### `base64ToFile(base64, filename?)`

把 base64 或 `data:` URL 转成 `File`。

| 参数       | 类型     | 默认值   | 说明                                         |
| ---------- | -------- | -------- | -------------------------------------------- |
| `base64`   | `string` | -        | 原始 base64 或 `data:` URL                   |
| `filename` | `string` | `'file'` | 输出文件名，没有扩展名时按 MIME 类型补一个。 |

校验失败抛 `Invalid base64 string.`。MIME 类型取自 `data:` 前缀，缺省为 `image/png`。

### `fileToBase64(file)`

把 `File` 或 `Blob` 读成 base64 `data:` URL。返回 `Promise<string>`。

### `isSameFileType(...files)`

比较每个文件的开头字节，判断它们是否完全一致。只传一个文件或不传时返回 `true`。比较两个或更多文件时，空文件会以 `File is empty or invalid.` reject。

| 参数       | 类型     | 说明         |
| ---------- | -------- | ------------ |
| `...files` | `File[]` | 待比较的文件 |

返回 `Promise<boolean>`。
