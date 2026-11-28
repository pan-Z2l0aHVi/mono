/**
 * 链接导入的统一解析：从任意文本或剪贴板 HTML 里提取多个链接、规范化并去重。
 *
 * 规范化规则镜像后端 `internal/normalize.URL`（scheme/host 小写、去默认端口、空 path 补 `/`），
 * 前端只用于实时预览与批内去重，落库仍以后端为准。两边共用同一组测试向量防跑偏。
 */

/** 一个被识别出来的链接：`raw` 是原文片段，`url` 是规范化结果。 */
export interface LinkImportCandidate {
  raw: string
  url: string
  source: 'text' | 'html'
}

export interface LinkImportResult {
  candidates: LinkImportCandidate[]
  /** 规范化后重复、被丢弃的候选数。 */
  duplicates: number
  /** 看起来像链接但规范化失败的原文片段（例如只有片段锚点的相对链接）。 */
  invalid: string[]
}

/**
 * 协议可选的 http(s) 链接：先匹配带协议的，再匹配裸域名。
 * 字符类排除空白、引号与中日韩文字/标点：中文正文通常不加空格，`链接https://a和b`
 * 若不排除 CJK，`和b` 会被并进上一条 URL 的路径里。
 */
const CANDIDATE_PATTERN =
  /(?<![\w])https?:\/\/[^\s<>"'`，。；：！？、（）【】《》\u3000-\u303f\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+|(?<![\w./@-])(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d{1,5})?(?:[/?#][^\s<>"'`，。；：！？、（）【】《》\u3000-\u303f\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]*)?/gi

/** 句末与包裹标点：扫描时可留在候选里，规范化时剥掉。 */
const TRAILING_PUNCTUATION = /[.,;:!?，。；：！？、…"'”’》」』】〕]+$/

const CLOSER_PAIRS: Record<string, string> = { ')': '(', ']': '[', '}': '{' }

/**
 * 裸域名候选的扩展名拒绝表：`README.md`、`photo.png` 这类文件名不该被补成 https 链接。
 * 只对「没有 path/query/hash」的候选生效，`example.com/a.md` 仍按链接处理。
 */
const FILE_LIKE_SUFFIXES = new Set([
  'md',
  'markdown',
  'txt',
  'pdf',
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'mp4',
  'mov',
  'm4v',
  'mp3',
  'wav',
  'flac',
  'zip',
  'tar',
  'gz',
  'dmg',
  'exe',
  'msi',
  'json',
  'jsonl',
  'csv',
  'js',
  'ts',
  'tsx',
  'jsx',
  'css',
  'yml',
  'yaml',
  'toml',
  'lock',
  'log',
  'sh',
  'py',
  'go',
  'rs',
  'java',
  'xml',
  'apk',
  'ipa',
  'iso'
])

/** 按码元统计字符出现次数：只用于 ASCII 括号配平，不需要字素簇语义。 */
function countChar(value: string, char: string): number {
  let count = 0
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] === char) count += 1
  }
  return count
}

/** 去掉句末标点；闭合括号仅在不平衡时剥离，`https://a.com/x_(y)` 里的 `)` 属于链接。 */
function stripTrailingPunctuation(value: string): string {
  let result = value
  for (;;) {
    const trimmed = result.replace(TRAILING_PUNCTUATION, '')
    if (trimmed !== result) {
      result = trimmed
      continue
    }
    const last = result.at(-1)
    if (!last) return result
    const opener = CLOSER_PAIRS[last]
    if (opener) {
      const closes = countChar(result, last)
      const opens = countChar(result, opener)
      if (closes > opens) {
        result = result.slice(0, -1)
        continue
      }
    }
    return result
  }
}

/** 裸域名没有 path/query/hash 且末段像文件扩展名时不当作链接。 */
function looksLikeFileName(candidate: string): boolean {
  if (/[/?#]/.test(candidate)) return false
  const host = candidate.split(':')[0] ?? ''
  const tld = host.split('.').at(-1)?.toLowerCase() ?? ''
  return FILE_LIKE_SUFFIXES.has(tld)
}

/**
 * 把一段候选规范化为可落库的 http(s) 链接；无协议时补 `https://`。
 * 返回 `URL.toString()` 的结果，与后端 normalize.URL 的口径一致。
 */
export function normalizeImportURL(raw: string): string | null {
  const trimmed = stripTrailingPunctuation(raw.trim())
  if (!trimmed) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const parsed = new URL(withScheme)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (!parsed.hostname) return null
    return parsed.toString()
  } catch {
    return null
  }
}

/** 按出现顺序扫描纯文本里的链接；已在候选里的重复项不重复返回。 */
export function scanTextLinks(text: string): string[] {
  const found: string[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(CANDIDATE_PATTERN)) {
    const candidate = match[0]
    if (looksLikeFileName(candidate) || seen.has(candidate)) continue
    seen.add(candidate)
    found.push(candidate)
  }
  return found
}

/**
 * 从剪贴板 HTML 里提取 `<a href>`；相对链接按 `baseUrl` 解析，无法解析的相对链接记为 invalid。
 * 只读锚点不读可见文本：富文本里被隐藏的链接也要能被导入。
 * raw 保留原始 href，url 是解析后的绝对地址。
 */
function scanHTMLLinks(
  html: string,
  baseUrl: string | undefined
): { links: { raw: string; url: string }[]; invalid: string[] } {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const links: { raw: string; url: string }[] = []
  const invalid: string[] = []
  for (const anchor of doc.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href')?.trim()
    if (!href || href.startsWith('#')) continue
    if (/^[a-z][a-z0-9+.-]*:/i.test(href) && !/^https?:/i.test(href)) {
      invalid.push(href)
      continue
    }
    if (/^https?:/i.test(href)) {
      links.push({ raw: href, url: href })
      continue
    }
    if (!baseUrl) {
      invalid.push(href)
      continue
    }
    try {
      links.push({ raw: href, url: new URL(href, baseUrl).toString() })
    } catch {
      invalid.push(href)
    }
  }
  return { links, invalid }
}

export interface LinkImportSource {
  /** 纯文本（粘贴文本或剪贴板纯文本）。 */
  text?: string
  /** 剪贴板 HTML；有锚点时优先从锚点提取。 */
  html?: string
  /** HTML 锚点的基准地址（复制来源页），用于解析相对链接。 */
  baseUrl?: string
}

/**
 * 解析一次导入输入：先提 HTML 锚点（复制自网页时最精确），再全文扫描文本兜底，
 * 按规范化结果去重并保留首次出现的顺序。
 */
export function extractImportLinks(input: LinkImportSource): LinkImportResult {
  const raw: { raw: string; url?: string; source: 'text' | 'html' }[] = []
  const invalid: string[] = []
  if (input.html) {
    const fromHTML = scanHTMLLinks(input.html, input.baseUrl)
    raw.push(...fromHTML.links.map(link => ({ raw: link.raw, url: link.url, source: 'html' as const })))
    invalid.push(...fromHTML.invalid)
    // 锚点的 href 已经由浏览器解析过，仍走一遍规范化保证与文本路径同一口径。
  }
  if (input.text) {
    raw.push(...scanTextLinks(input.text).map(url => ({ raw: url, source: 'text' as const })))
  }

  const seen = new Set<string>()
  const candidates: LinkImportCandidate[] = []
  let duplicates = 0
  for (const item of raw) {
    const url = normalizeImportURL(item.url ?? item.raw)
    if (!url) {
      invalid.push(item.raw)
      continue
    }
    if (seen.has(url)) {
      duplicates += 1
      continue
    }
    seen.add(url)
    candidates.push({ raw: item.raw, url, source: item.source })
  }
  return { candidates, duplicates, invalid }
}
