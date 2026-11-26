# string

English | [简体中文](./string.CN.md)

String helpers including file extension extraction.

## Examples

### Extract file extension

```ts demo=file-extension
import { getFileExtension } from '@greypan/js-kit'

const ext1: string = getFileExtension('archive.tar.gz') // 'gz'
const ext2: string = getFileExtension('README') // ''

console.log(ext1, ext2)
```

```js
import { getFileExtension } from '@greypan/js-kit'

const ext1 = getFileExtension('archive.tar.gz') // 'gz'
const ext2 = getFileExtension('README') // ''

console.log(ext1, ext2)
```

## API

| Function           | Signature                      | Description                                                                    |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------ |
| `getFileExtension` | `(filename: string) => string` | Returns the lowercase file extension without leading dot, or `''` when absent. |
