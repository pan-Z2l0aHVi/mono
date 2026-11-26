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
