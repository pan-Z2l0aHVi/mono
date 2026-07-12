# URL

解析和构建 URL，支持查询参数和 hash

[English](./README.md) | 简体中文

## 概述

URL 处理工具函数。`parseUrl` 将 URL 字符串解析为结构化对象，`stringifyUrl` 从结构化组件构建 URL。两者都支持相对路径。

## API

### `parseUrl(url?)`

将 URL 字符串解析为结构化对象。支持绝对路径和相对路径。

| 参数  | 类型     | 默认值 | 说明         |
| ----- | -------- | ------ | ------------ |
| `url` | `string` | `''`   | 待解析的 URL |

**返回：** `URLObject`

| 属性    | 类型                     | 说明                                                   |
| ------- | ------------------------ | ------------------------------------------------------ |
| `base`  | `string`                 | origin + pathname（绝对路径）或仅 pathname（相对路径） |
| `query` | `Record<string, string>` | 查询参数键值对                                         |
| `hash`  | `string`                 | hash 片段，包含 `#`                                    |

```ts
import { parseUrl } from '@greypan/js-kit'

parseUrl('https://example.com/path?key=val#hash')
// { base: 'https://example.com/path', query: { key: 'val' }, hash: '#hash' }

parseUrl('/relative/path?foo=bar')
// { base: '/relative/path', query: { foo: 'bar' }, hash: '' }

parseUrl('')
// { base: '', query: {}, hash: '' }
```

### `stringifyUrl(opts, omitNil?)`

从结构化组件构建 URL 字符串。

| 参数      | 类型                 | 默认值 | 说明                                       |
| --------- | -------------------- | ------ | ------------------------------------------ |
| `opts`    | `Partial<URLObject>` | -      | URL 组件：`base`、`query`、`hash`          |
| `omitNil` | `boolean`            | `true` | 是否移除查询参数中的 `undefined`/`null` 值 |

**返回：** `string`

```ts
import { stringifyUrl } from '@greypan/js-kit'

stringifyUrl({
  base: 'https://example.com/path',
  query: { key: 'val', empty: null },
  hash: '#section'
})
// 'https://example.com/path?key=val#section'（null 值被忽略）

stringifyUrl({
  base: '/search',
  query: { q: 'hello', page: 1 }
})
// '/search?q=hello&page=1'

stringifyUrl({ base: '/page' })
// '/page'
```

## 注意事项

- 相对路径解析时临时使用 `http://n.n` 作为 base
- `parseUrl` 对格式错误的 URL 抛出 `Error('Invalid URL.')`
- `stringifyUrl` 会自动为 hash 补全 `#`
- 当 `base` 已包含 `?` 时，`stringifyUrl` 使用 `&` 连接
