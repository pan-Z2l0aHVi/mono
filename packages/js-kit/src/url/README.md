# URL

> Parse and build URLs with query parameters and a hash.

English | [简体中文](./README.CN.md)

## Overview

`parseUrl` turns a URL string into `base`, `query`, and `hash`. `stringifyUrl` builds a URL from those parts. Both support relative URLs.

## API

### `parseUrl(url?)`

Parse a URL string. Absolute, relative, and protocol-relative URLs are supported.

| Parameter | Type     | Default | Description         |
| --------- | -------- | ------- | ------------------- |
| `url`     | `string` | `''`    | URL string to parse |

Returns a `URLObject`.

| Property | Type                     | Description                                         |
| -------- | ------------------------ | --------------------------------------------------- |
| `base`   | `string`                 | Origin and pathname for absolute URLs, or pathname. |
| `query`  | `Record<string, string>` | Query parameters as key-value pairs.                |
| `hash`   | `string`                 | Hash fragment, including `#`.                       |

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

Protocol-relative URLs keep their `//host/path` form.

### `stringifyUrl(opts, omitNil?)`

Build a URL string from `base`, `query`, and `hash`.

| Parameter | Type                 | Default | Description                                 |
| --------- | -------------------- | ------- | ------------------------------------------- |
| `opts`    | `Partial<URLObject>` | -       | URL components: `base`, `query`, `hash`.    |
| `omitNil` | `boolean`            | `true`  | Remove `undefined` and `null` query values. |

Returns a `string`.

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

## Notes

- `parseUrl` throws `Error('Invalid URL.')` for a malformed URL.
- `stringifyUrl` adds `#` to a hash that does not start with it.
- Query values are converted to strings, so numbers and booleans work.
- When `base` ends with `?`, parameters are appended directly. When `base` already contains `?` elsewhere, parameters use `&`.
