---
title: 文件工具
---

# 文件工具

浏览器端文件处理工具，涵盖 Base64 校验与转换、文件头魔数类型比对、图片尺寸读取以及带进度回调的文件下载。

## Base64 互转、图片尺寸与魔数校验

校验 Base64 字符串、在 `File` 与 `data:` URL 之间互转、读取图片宽高，以及用 `isSameFileType` 比对真实文件头。

```ts demo=file-inspector
import { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } from '@greypan/browser-kit'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const valid = isValidBase64(pngDataUrl)
const fileA = base64ToFile(pngDataUrl, 'pixel-a')
const fileB = base64ToFile(pngDataUrl, 'pixel-b')

const [dataUrl, info, sameType] = await Promise.all([
  fileToBase64(fileA),
  getImageInfo(fileA),
  isSameFileType(fileA, fileB)
])

console.log({ valid, dataUrlPrefix: dataUrl.slice(0, 22), info, sameType })
```

```js
import { base64ToFile, fileToBase64, getImageInfo, isSameFileType, isValidBase64 } from '@greypan/browser-kit'

const pngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const valid = isValidBase64(pngDataUrl)
const fileA = base64ToFile(pngDataUrl, 'pixel-a')
const fileB = base64ToFile(pngDataUrl, 'pixel-b')

const [dataUrl, info, sameType] = await Promise.all([
  fileToBase64(fileA),
  getImageInfo(fileA),
  isSameFileType(fileA, fileB)
])

console.log({ valid, dataUrlPrefix: dataUrl.slice(0, 22), info, sameType })
```

## API

| 函数                                        | 说明                                                  |
| ------------------------------------------- | ----------------------------------------------------- |
| `downloadFile(arg, filename?, onProgress?)` | 下载 `File`、`Blob` 或远程 URL，支持流式进度回调      |
| `getImageInfo(source)`                      | 读取 `File`、`Blob` 或图片 URL 的 `{ width, height }` |
| `isValidBase64(str)`                        | 校验裸 Base64 字符串或 `data:` URL 是否合法           |
| `base64ToFile(base64, filename?)`           | 将 Base64 / `data:` URL 转为 `File` 对象              |
| `fileToBase64(file)`                        | 将 `File` 或 `Blob` 转为 Base64 `data:` URL           |
| `isSameFileType(...files)`                  | 基于前 8 字节文件头魔数判断多个文件真实类型是否一致   |
