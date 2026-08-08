import { isNullish, omitBy } from 'remeda'

type QueryValue = string | number | boolean | undefined | null
interface URLObject {
  base: string
  query: Record<string, QueryValue>
  hash: string
}

export function parseUrl(url = ''): URLObject {
  const isAbsolute = /^https?:\/\//.test(url)
  const isProtocolRelative = url.startsWith('//')
  const isRelative = !isAbsolute && !isProtocolRelative

  try {
    // 只有 http(s):// 开头的绝对 URL 不需要 base；协议相对 URL（//host）与
    // 相对路径都借用 http://n.n 作为 base，否则 new URL('//host', undefined) 会抛错
    const parsed = new URL(url, isAbsolute ? undefined : 'http://n.n')

    return {
      // 协议相对 URL 保持 //host/path 形式，避免丢失协议
      base: isRelative
        ? parsed.pathname
        : isProtocolRelative
          ? `//${parsed.host}${parsed.pathname}`
          : `${parsed.origin}${parsed.pathname}`,
      query: Object.fromEntries(parsed.searchParams),
      hash: parsed.hash
    }
  } catch {
    throw new Error('Invalid URL.')
  }
}

export function stringifyUrl(opts: Partial<URLObject>, omitNil = true): string {
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
