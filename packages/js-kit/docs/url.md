# url

English | [简体中文](./url.CN.md)

Parse and build absolute, relative, and protocol-relative URLs with structured query parameters and hash.

## Examples

### Parse and stringify URLs

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

| Function       | Signature                                                 | Description                                                                             |
| -------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `parseUrl`     | `(url?: string) => URLObject`                             | Splits a URL string into `{ base, query, hash }`.                                       |
| `stringifyUrl` | `(opts: Partial<URLObject>, omitNil?: boolean) => string` | Builds a URL string from `{ base, query, hash }` (omits `null`/`undefined` by default). |
