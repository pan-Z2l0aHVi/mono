# File

> Download files, inspect images, convert base64, and compare file types.

English | [简体中文](./README.CN.md)

## Overview

Browser-only file helpers re-exported by `@greypan/browser-kit`. They use `fetch`, `Blob`, `FileReader`, `Image`, and object URLs.

## API

### `downloadFile(arg, filename?, onProgress?)`

Download a `File`, `Blob`, or remote URL.

| Parameter    | Type                        | Default | Description                                                       |
| ------------ | --------------------------- | ------- | ----------------------------------------------------------------- |
| `arg`        | `File \| Blob \| string`    | -       | File, Blob, or absolute URL                                       |
| `filename`   | `string`                    | derived | Output name. Defaults to the File name or the URL's last segment. |
| `onProgress` | `(percent: number) => void` | -       | Progress for remote URLs, from 0 to 100.                          |

```ts
import { downloadFile } from '@greypan/browser-kit'

await downloadFile('/api/report.pdf', 'report.pdf')
await downloadFile(file)
```

Remote progress needs a `Content-Length` response header. Without it, no progress callbacks fire. A failed response throws `Download failed: <status> <statusText>`, a network failure throws `Network error: failed to fetch the file.`, and a relative URL string throws `Invalid URL: <arg>.`.

### `getImageInfo(source)`

Return the image width and height.

| Parameter | Type                     | Description              |
| --------- | ------------------------ | ------------------------ |
| `source`  | `File \| Blob \| string` | Image File, Blob, or URL |

Returns `Promise<{ width: number; height: number }>`.

### `isValidBase64(str)`

Check whether a string is valid base64. Raw base64 and `data:` URLs are accepted. Empty strings, bad padding, and illegal characters return `false`.

### `base64ToFile(base64, filename?)`

Convert base64 or a `data:` URL to a `File`.

| Parameter  | Type     | Default  | Description                                                  |
| ---------- | -------- | -------- | ------------------------------------------------------------ |
| `base64`   | `string` | -        | Raw base64 or a `data:` URL                                  |
| `filename` | `string` | `'file'` | Output name. A MIME-derived extension is added when missing. |

Throws `Invalid base64 string.` when validation fails. The MIME type comes from the `data:` prefix and defaults to `image/png`.

### `fileToBase64(file)`

Read a `File` or `Blob` as a base64 `data:` URL. Returns `Promise<string>`.

### `isSameFileType(...files)`

Compare the leading bytes of each file and return whether they are all identical. One file, or no files, returns `true`. When comparing two or more files, an empty file rejects with `File is empty or invalid.`.

| Parameter  | Type     | Description      |
| ---------- | -------- | ---------------- |
| `...files` | `File[]` | Files to compare |

Returns `Promise<boolean>`.
