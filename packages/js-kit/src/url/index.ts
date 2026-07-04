import { isNullish, omitBy } from 'remeda'

type QueryValue = string | number | boolean | undefined | null
interface URLObject {
  base: string
  query: Record<string, QueryValue>
  hash: string
}

export function urlParse(url = ''): URLObject {
  const isRelative = !/^(https?:)?\/\//.test(url)

  try {
    // 如果 url 是相对路径，就借用 http://n.n 作为 base
    const parsed = new URL(url, isRelative ? 'http://n.n' : undefined)

    return {
      base: isRelative ? parsed.pathname : `${parsed.origin}${parsed.pathname}`,
      query: Object.fromEntries(parsed.searchParams),
      hash: parsed.hash
    }
  } catch {
    throw new Error('Invalid URL.')
  }
}

export function urlStringify(opts: Partial<URLObject>, omitNil = true): string {
  const { base = '', query = {}, hash = '' } = opts

  const cleanQuery = omitNil ? omitBy(query, isNullish) : query
  const params = new URLSearchParams()

  Object.entries(cleanQuery).forEach(([key, val]) => {
    params.append(key, String(val))
  })

  // 修复 Hash 自动补全 # 的问题
  const normalizedHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''
  const queryString = params.toString()
  if (!queryString) return base + normalizedHash

  const connector = base.includes('?') ? '&' : '?'
  return `${base}${connector}${queryString}${normalizedHash}`
}
