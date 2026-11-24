/*
 * markdown 行内 content 的信任边界。
 *
 * md-to-meta 把行内内容在解析期渲染成 HTML 字符串放进 `content`，宿主按结构用 v-html 注入——
 * demo 站的语料是仓库自己写的文档，直接注入成立；interweave 渲染的是用户的本地文件，
 * 块级原始 HTML 也会原样进入 `content`，而 WebView 带着可调的 Wails bindings，所以这里
 * 把所有 `content` 与 `img.src` 一律视为不可信：先按白名单重建，再交给 v-html。
 * 链接与图片不在注入时解析目标，而是统一改写成受控 scheme，点击由预览层拦截后交给系统浏览器。
 */

/** 允许保留的标签与其允许的属性；不在表内的标签降级为其文本内容，不在表内的属性丢弃。 */
const ALLOWED_TAGS: Record<string, readonly string[]> = {
  a: ['href', 'title'],
  abbr: ['title'],
  b: [],
  blockquote: [],
  br: [],
  code: [],
  del: [],
  em: [],
  i: [],
  img: ['src', 'alt', 'title', 'width', 'height'],
  kbd: [],
  mark: [],
  s: [],
  small: [],
  span: [],
  strong: [],
  sub: [],
  sup: [],
  u: []
}

/** 允许的外链 scheme；相对地址会按应用 origin 解析（可能打到本地媒体端点），一律丢弃。 */
const ALLOWED_LINK_SCHEMES = ['http:', 'https:', 'mailto:']

/** 受控外链的 scheme 前缀：预览层在捕获阶段拦 `data-md-link` 的点击交系统浏览器。 */
export const SANITIZED_LINK_ATTRIBUTE = 'data-md-href'

export interface SanitizeResult {
  html: string
  /** 清洗后的外链目标（已过滤 scheme）；供预览层拦截点击时回查。 */
  links: string[]
}

/** 清洗一段 markdown 行内 HTML：返回可直接 v-html 的字符串。 */
export function sanitizeInlineHtml(html: string): SanitizeResult {
  const links: string[] = []
  const parser = new DOMParser()
  const document = parser.parseFromString(`<body>${html}</body>`, 'text/html')
  const root = document.body

  // 只处理 root 的子树：root 本身是清洗器的装载壳，不参与白名单判定。
  // 快照再迭代：pruneElement 会替换/删除元素，活集合上边走边改会跳节点。
  for (const child of Array.from(root.children)) pruneElement(child, links)

  // 序列化时剥掉外壳：只回内容本身。
  const container = document.createElement('div')
  while (root.firstChild) container.appendChild(root.firstChild)
  return { html: container.innerHTML, links }
}

/** 判断一个 href/src 是否放行；放行时返回原值，否则返回 null。 */
export function allowedLinkTarget(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed === '') return null
  try {
    const parsed = new URL(trimmed, 'https://interweave.invalid')
    // 解析后仍是相对地址（origin 落在占位 origin 且没有 scheme）→ 丢弃。
    if (parsed.origin === 'https://interweave.invalid' && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null
    return ALLOWED_LINK_SCHEMES.includes(parsed.protocol) ? trimmed : null
  } catch {
    return null
  }
}

function pruneElement(node: Element, links: string[]): void {
  for (const child of Array.from(node.children)) pruneElement(child, links)

  const tag = node.tagName.toLowerCase()
  const allowedAttributes = ALLOWED_TAGS[tag]
  if (allowedAttributes === undefined) {
    // 不在白名单的标签：用其文本内容替换（markdown 的行内语义里没有脚本位）。
    node.replaceWith(...node.childNodes)
    return
  }
  for (const attribute of Array.from(node.attributes)) {
    // data-md-href 不在放行清单：那是清洗器自己写入的受控属性，输入自带的同名属性必须剥掉，
    // 否则 raw HTML 可以凭它绕过 scheme 白名单直达系统协议处理器。
    const keep = allowedAttributes.includes(attribute.name.toLowerCase()) || attribute.name === 'alt'
    if (!keep) node.removeAttribute(attribute.name)
  }
  if (tag === 'a') {
    node.removeAttribute(SANITIZED_LINK_ATTRIBUTE)
    const href = node.getAttribute('href')
    node.removeAttribute('href')
    const target = href === null ? null : allowedLinkTarget(href)
    if (target === null) {
      // 死链降级为纯文本标记：保留样式语义，不再可点。
      node.setAttribute('data-md-link-dead', '')
    } else {
      node.setAttribute(SANITIZED_LINK_ATTRIBUTE, target)
      links.push(target)
    }
    return
  }
  if (tag === 'img') {
    // 行内图片：只放行 http(s) 绝对地址；相对地址会按应用 origin 解析（可能打到本地媒体端点），丢弃。
    node.removeAttribute('srcset')
    const src = node.getAttribute('src')
    if (src === null || allowedLinkTarget(src) === null) {
      node.replaceWith(...node.childNodes)
    } else {
      node.setAttribute('loading', 'lazy')
      node.setAttribute('referrerpolicy', 'no-referrer')
    }
  }
}
