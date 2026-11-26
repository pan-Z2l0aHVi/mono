# copy

English | [简体中文](./copy.CN.md)

Cross-browser clipboard copy helper supporting plain strings and `Blob` inputs with automatic fallback.

## Examples

### Copy text or Blob

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

| Function          | Signature                                                           | Description                                      |
| ----------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| `copyToClipboard` | `(content: string \| Blob, options?: CopyOptions) => Promise<void>` | Writes text or a `Blob` to the system clipboard. |

| Option   | Type      | Default        | Description                                                   |
| -------- | --------- | -------------- | ------------------------------------------------------------- |
| `format` | `string`  | `'text/plain'` | Clipboard MIME type (inferred from `Blob.type` when omitted). |
| `debug`  | `boolean` | `false`        | Enables diagnostic console logging when copy fails.           |
