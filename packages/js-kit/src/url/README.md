# URL

Parse and stringify URLs with query params and hash

English | [简体中文](./README.CN.md)

## Overview

Utilities for working with URLs. `parseUrl` breaks a URL string into structured components, and `stringifyUrl` builds a URL from those components. Both support relative paths.

## API

### `parseUrl(url?)`

Parse a URL string into a structured object. Supports both absolute and relative URLs.

| Parameter | Type     | Default | Description         |
| --------- | -------- | ------- | ------------------- |
| `url`     | `string` | `''`    | URL string to parse |

**Returns:** `URLObject`

| Property | Type                     | Description                                              |
| -------- | ------------------------ | -------------------------------------------------------- |
| `base`   | `string`                 | Origin + pathname (absolute) or pathname only (relative) |
| `query`  | `Record<string, string>` | Query parameters as key-value pairs                      |
| `hash`   | `string`                 | Hash fragment including `#`                              |

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

Build a URL string from structured components.

| Parameter | Type                 | Default | Description                                 |
| --------- | -------------------- | ------- | ------------------------------------------- |
| `opts`    | `Partial<URLObject>` | -       | URL components: `base`, `query`, `hash`     |
| `omitNil` | `boolean`            | `true`  | Remove `undefined`/`null` values from query |

**Returns:** `string`

```ts
import { stringifyUrl } from '@greypan/js-kit'

stringifyUrl({
  base: 'https://example.com/path',
  query: { key: 'val', empty: null },
  hash: '#section'
})
// 'https://example.com/path?key=val#section' (null value omitted)

stringifyUrl({
  base: '/search',
  query: { q: 'hello', page: 1 }
})
// '/search?q=hello&page=1'

stringifyUrl({ base: '/page' })
// '/page'
```

## Notes

- Relative URLs use `http://n.n` as a temporary base for parsing
- `parseUrl` throws `Error('Invalid URL.')` for malformed URLs
- `stringifyUrl` auto-completes hash with `#` if missing
- When `base` already contains `?`, `stringifyUrl` uses `&` instead of `?`
