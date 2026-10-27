# File

Download, image inspection, base64 conversion, and file-type comparison

English | [简体中文](./README.CN.md)

## Overview

Browser-only file helpers, re-exported by `@greypan/browser-kit`. All of them require DOM APIs (`fetch`, `Blob`, `FileReader`, `Image`, `URL.createObjectURL`).

## API

### `downloadFile(arg, filename?, onProgress?)`

Trigger a browser download for a `File`, `Blob`, or remote URL.

| Parameter    | Type                        | Default | Description                                                      |
| ------------ | --------------------------- | ------- | ---------------------------------------------------------------- |
| `arg`        | `File \| Blob \| string`    | -       | File, Blob, or absolute URL                                      |
| `filename`   | `string`                    | derived | Output name; defaults to the File name or the URL's last segment |
| `onProgress` | `(percent: number) => void` | -       | Called for remote URLs while the body is streamed (0–100)        |

```ts
import { downloadFile } from '@greypan/browser-kit'

await downloadFile('/api/report.pdf', 'report.pdf')
await downloadFile(file)
```

Behavior:

- Remote responses stream through a `ReadableStream`, so progress is reported from `Content-Length`; without that header no progress callbacks fire.
- A non-OK response throws `Download failed: <status> <statusText>`; a fetch failure throws `Network error: failed to fetch the file.`; a relative string throws `Invalid URL: <arg>.` before fetching.
- The blob URL is revoked and the temporary anchor removed 100 ms after the click, so the browser has time to start the download.

### `getImageInfo(source)`

Resolve an image's natural display size.

| Parameter | Type                     | Default | Description              |
| --------- | ------------------------ | ------- | ------------------------ |
| `source`  | `File \| Blob \| string` | -       | Image File, Blob, or URL |

**Returns:** `Promise<{ width: number; height: number }>`. Blob URLs created internally are revoked after load.

### `isValidBase64(str)`

Check whether a string is valid base64. Accepts raw base64 and `data:` URLs; empty strings, bad padding, and illegal characters return `false`.

### `base64ToFile(base64, filename?)`

Convert base64 or a `data:` URL to a `File`.

| Parameter  | Type     | Default  | Description                                                   |
| ---------- | -------- | -------- | ------------------------------------------------------------- |
| `base64`   | `string` | -        | Raw base64 or a `data:` URL                                   |
| `filename` | `string` | `'file'` | Output name; a MIME-derived extension is appended when absent |

Throws `Invalid base64 string.` when validation fails. The MIME type comes from the `data:` prefix and defaults to `image/png`.

### `fileToBase64(file)`

Read a `File` or `Blob` as a base64 `data:` URL.

**Returns:** `Promise<string>`.

### `isSameFileType(...files)`

Compare the first 8 bytes of each file (Magic Number) and return whether they are all identical. One file, or none, returns `true`; when comparing two or more files, an empty file rejects with `File is empty or invalid.`.

| Parameter  | Type     | Default | Description      |
| ---------- | -------- | ------- | ---------------- |
| `...files` | `File[]` | -       | Files to compare |

**Returns:** `Promise<boolean>`.
