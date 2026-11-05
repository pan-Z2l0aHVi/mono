# URL

> 解析和构建带查询参数与 hash 的 URL。

[English](./README.md) | 简体中文

## 概述

`parseUrl` 把 URL 字符串拆成 `base`、`query` 和 `hash`。`stringifyUrl` 用这三部分构建 URL。两者都支持相对 URL。

## API

### `parseUrl(url?)`

解析 URL 字符串。支持绝对 URL、相对 URL 与协议相对 URL。

| 参数  | 类型     | 默认值 | 说明         |
| ----- | -------- | ------ | ------------ |
| `url` | `string` | `''`   | 待解析的 URL |

返回 `URLObject`。

| 属性    | 类型                     | 说明                                                     |
| ------- | ------------------------ | -------------------------------------------------------- |
| `base`  | `string`                 | 绝对 URL 的 origin 与 pathname，或相对 URL 的 pathname。 |
| `query` | `Record<string, string>` | 查询参数键值对。                                         |
| `hash`  | `string`                 | 包含 `#` 的 hash 片段。                                  |

```ts
import { parseUrl } from '@greypan/js-kit'

parseUrl('https://example.com/path?key=val#hash')
// { base: 'https://example.com/path', query: { key: 'val' }, hash: '#hash' }

parseUrl('/relative/path?foo=bar')
// { base: '/relative/path', query: { foo: 'bar' }, hash: '' }

parseUrl('')
// { base: '/', query: {}, hash: '' }

parseUrl('//cdn.example.com/a.js')
// { base: '//cdn.example.com/a.js', query: {}, hash: '' }
```

协议相对 URL 保留 `//host/path` 形式。

### `stringifyUrl(opts, omitNil?)`

用 `base`、`query` 和 `hash` 构建 URL 字符串。

| 参数      | 类型                 | 默认值 | 说明                                     |
| --------- | -------------------- | ------ | ---------------------------------------- |
| `opts`    | `Partial<URLObject>` | -      | URL 组件：`base`、`query`、`hash`。      |
| `omitNil` | `boolean`            | `true` | 移除查询参数中的 `undefined` 与 `null`。 |

返回 `string`。

```ts
import { stringifyUrl } from '@greypan/js-kit'

stringifyUrl({
  base: 'https://example.com/path',
  query: { key: 'val', empty: null },
  hash: '#section'
})
// 'https://example.com/path?key=val#section'

stringifyUrl({
  base: '/search',
  query: { q: 'hello', page: 1 }
})
// '/search?q=hello&page=1'

stringifyUrl({ base: '/page' })
// '/page'
```

## 说明

- URL 格式错误时，`parseUrl` 抛出 `Error('Invalid URL.')`。
- `stringifyUrl` 会给缺少 `#` 的 hash 补上 `#`。
- 查询参数值会转成字符串，因此数字和布尔值也可以使用。
- `base` 以 `?` 结尾时直接拼接参数。`base` 其他位置已包含 `?` 时使用 `&`。
