# url

[English](./url.md) | 简体中文

解析与构建绝对路径、相对路径及协议相对 URL，支持结构化 `query` 参数与 `hash`。

## 示例

### 解析与构建 URL

```ts demo=url-playground
import { parseUrl, stringifyUrl } from '@greypan/js-kit'

const parsed = parseUrl('https://example.com/search?q=mono&tag=a&tag=b#top')
const rebuilt = stringifyUrl(
  {
    base: parsed.base,
    query: { ...parsed.query, page: '2', empty: undefined },
    hash: parsed.hash
  },
  true
)

console.log(parsed, rebuilt)
```

```js
import { parseUrl, stringifyUrl } from '@greypan/js-kit'

const parsed = parseUrl('https://example.com/search?q=mono&tag=a&tag=b#top')
const rebuilt = stringifyUrl(
  {
    base: parsed.base,
    query: { ...parsed.query, page: '2', empty: undefined },
    hash: parsed.hash
  },
  true
)

console.log(parsed, rebuilt)
```

## API

| 函数           | 签名                                                      | 说明                                                                          |
| -------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `parseUrl`     | `(url?: string) => URLObject`                             | 将 URL 字符串拆解为 `{ base, query, hash }`。                                 |
| `stringifyUrl` | `(opts: Partial<URLObject>, omitNil?: boolean) => string` | 根据 `{ base, query, hash }` 拼接 URL 字符串（默认忽略 `null`/`undefined`）。 |
