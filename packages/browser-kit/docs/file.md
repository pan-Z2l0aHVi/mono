---
title: File
---

# File

Browser file helpers for base64 conversion and validation, magic-number file type checks, image dimension reading, and file downloads with progress callbacks.

## Base64 conversion, image info & magic-number check

Validate base64 strings, convert between `File` and `data:` URLs, read image dimensions, and compare real file headers with `isSameFileType`.

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

| Function                                    | Description                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| `downloadFile(arg, filename?, onProgress?)` | Trigger download from a `File`, `Blob`, or absolute URL with stream progress |
| `getImageInfo(source)`                      | Resolve `{ width, height }` for a `File`, `Blob`, or image URL               |
| `isValidBase64(str)`                        | Validate raw base64 strings or `data:` URLs                                  |
| `base64ToFile(base64, filename?)`           | Convert base64 / `data:` URL into a `File`                                   |
| `fileToBase64(file)`                        | Convert a `File` or `Blob` into a base64 `data:` URL                         |
| `isSameFileType(...files)`                  | Compare leading 8-byte magic numbers across files                            |
