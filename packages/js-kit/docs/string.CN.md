# string

[English](./string.md) | 简体中文

字符串辅助工具，提供文件名扩展名提取等能力。

## 示例

### 提取文件扩展名

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

| 函数               | 签名                           | 说明                                                        |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| `getFileExtension` | `(filename: string) => string` | 返回不含前导点号的文件扩展名；无扩展名时返回空字符串 `''`。 |
