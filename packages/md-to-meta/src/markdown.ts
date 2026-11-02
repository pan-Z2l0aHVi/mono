import { createHash } from 'node:crypto'

import { toHtml } from 'hast-util-to-html'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { fail } from './errors'
import { highlight } from './highlight'
import type { CodeFile, MetaNode } from './types'

interface MdPosition {
  start: { offset: number }
  end: { offset: number }
}

interface MdNode {
  type: string
  value?: string
  lang?: string | null
  meta?: string | null
  depth?: number
  ordered?: boolean
  url?: string
  alt?: string
  children?: MdNode[]
  position?: MdPosition
}

/** 解析一篇 markdown 需要的外部规则：只有 `exec`，它决定哪些围栏额外带上加载 thunk。 */
export interface ParseOptions {
  exec: readonly string[]
}

/** 一篇 markdown 的解析结果：通用节点树，加上围栏落成的代码文件。 */
export interface ParsedMarkdown {
  nodes: MetaNode[]
  codeFiles: CodeFile[]
}

/**
 * 行内 HTML：把 mdast 的行内子节点交给 remark-rehype 出 HTML。
 * 空集合喂给 hast 会产出没有 children 的 root，`toHtml` 直接抛，所以先短路。
 */
const prose = unified().use(remarkParse).use(remarkRehype)

function renderInline(nodes: MdNode[]): string {
  if (nodes.length === 0) return ''
  // 行内节点要包在一个段落里交给 remark-rehype：直接挂在 root 上，`toHtml` 会在子节点之间插换行。
  const hast = prose.runSync({
    type: 'root',
    children: [{ type: 'paragraph', children: nodes }]
  } as unknown as Parameters<typeof prose.runSync>[0])
  const html = toHtml(hast as never, { characterReferences: { useNamedReferences: true } }).trim()
  // 剥掉承载用的段落外壳，留下行内 HTML。
  return html.replace(/^<p>/, '').replace(/<\/p>$/, '')
}

/** 单元格与标题是手写的一小段 markdown，走同一条行内管线，文档里不会出现两套渲染规则。 */
function renderInlineText(text: string): string {
  const tree = prose.parse(text)
  // 单元格原文解析出来是一个段落；取它的行内子节点，产物里才是行内 HTML 而不是 `<p>` 包一层。
  const first = (tree.children ?? [])[0] as unknown as MdNode | undefined
  return renderInline(first?.type === 'paragraph' ? (first.children ?? []) : [])
}

/**
 * 围栏语言名直接当扩展名用。语言名来自文档作者，不能带路径分隔符，否则产物会写到
 * `codeblock/` 之外。无语言围栏落成 `.txt`。
 */
function extensionOf(lang: string, file: string): string {
  if (!lang) return 'txt'
  if (/[/\\\s]/.test(lang)) fail(`${file}：围栏语言名 \`${lang}\` 不能包含路径分隔符或空白`)
  return lang
}

/**
 * 代码文件按内容寻址：同一段围栏跨文档、同文档重复出现都落到同一个文件，
 * 改一块只换一个文件名，diff 噪音最小。
 */
function codeFileOf(code: string, ext: string): CodeFile {
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 12)
  return {
    path: `./codeblock/${hash}.${ext}`,
    // mdast 的 code 值不含行尾换行：去掉尾部空白后补一个，落盘文件就是可直接编译的源码。
    content: `${code.trimEnd()}\n`
  }
}

/**
 * 内存里的加载标记：序列化时按 `path` 写字面 specifier 的 thunk，宿主拿到的永远是产物里那份。
 * 这里只回答「这条围栏命中了 exec」，不做运行时变量 import。
 */
const LOAD_MARKER = () => Promise.resolve(undefined)

/** 按未转义的 `|` 切单元格，并把 `\|` 还原成字面竖线——与 GFM 同一条规则。 */
function splitCells(line: string): string[] {
  const body = line.replace(/^\|/, '').replace(/\|$/, '')
  const cells: string[] = []
  let current = ''
  for (let index = 0; index < body.length; index++) {
    const char = body[index]
    if (char === '\\' && body[index + 1] === '|') {
      current += '|'
      index++
      continue
    }
    if (char === '|') {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  cells.push(current.trim())
  return cells
}

function isDelimiterRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every(cell => /^:?-+:?$/.test(cell))
}

/**
 * 表格是 GFM 扩展，不在 CommonMark 里，`remark-parse` 会把整张表读成一个段落。
 * 这里按原文行读取：首行是表头，第二行是分隔行，其余是数据行。形状不成立时不算表，
 * 交回普通段落——引擎不为「写了竖线的散文」凭空造表。
 */
function tableRowsOf(node: MdNode, source: string): string[][] | undefined {
  if (!node.position) return undefined
  const lines = source
    .slice(node.position.start.offset, node.position.end.offset)
    .split('\n')
    .filter(line => line.trim() !== '')
  if (lines.length < 2) return undefined
  const first = lines[0]
  if (!first?.trim().startsWith('|')) return undefined
  const head = splitCells(first.trim())
  const delimiter = splitCells(lines[1]?.trim() ?? '')
  if (delimiter.length !== head.length || !isDelimiterRow(delimiter)) return undefined
  return [head, ...lines.slice(2).map(line => splitCells(line.trim()))]
}

function tableNode(rows: string[][]): MetaNode {
  const [head, ...body] = rows
  const children: MetaNode[] = []
  for (const [index, cells] of [head, ...body].entries()) {
    const label = index === 0 ? 'th' : 'td'
    children.push({
      label: 'tr',
      children: cells.map(cell => ({ label, content: renderInlineText(cell) }))
    })
  }
  return { label: 'table', children }
}

/** 段落的唯一子节点是一张图片时，把它提成结构化节点，宿主不必从 HTML 里挖 `src`。 */
function imageOf(node: MdNode): MdNode | undefined {
  const children = node.children ?? []
  if (children.length !== 1 || children[0]?.type !== 'image') return undefined
  return children[0]
}

/** 列表项：行内内容放进 `content`，嵌套块（子列表、引用块……）放进 `children`。 */
async function listItemNode(node: MdNode, ctx: ParseContext): Promise<MetaNode> {
  const blocks = node.children ?? []
  const first = blocks[0]
  const hasMore = blocks.length > 1
  if (!hasMore && first?.type === 'paragraph')
    return { label: 'li', content: renderInline(first.children ?? []).trim() }
  const children = await blockNodes(blocks, ctx)
  return { label: 'li', children }
}

async function blockNodes(nodes: MdNode[], ctx: ParseContext): Promise<MetaNode[]> {
  const out: MetaNode[] = []
  for (const node of nodes) {
    const converted = await blockNode(node, ctx)
    if (converted) out.push(converted)
  }
  return out
}

async function blockNode(node: MdNode, ctx: ParseContext): Promise<MetaNode | undefined> {
  switch (node.type) {
    case 'heading': {
      const depth = node.depth ?? 1
      if (depth < 1 || depth > 6) fail(`${ctx.file}：标题层级 ${depth} 超出 h1–h6`)
      const label = `h${depth}` as MetaNode['label']
      const content = renderInline(node.children ?? []).trim()
      return { label, id: `section-${++ctx.headings}`, content }
    }
    case 'paragraph': {
      const image = imageOf(node)
      if (image) return { label: 'img', src: image.url ?? '', alt: image.alt ?? '' }
      const rows = tableRowsOf(node, ctx.source)
      if (rows) return tableNode(rows)
      return { label: 'p', content: renderInline(node.children ?? []).trim() }
    }
    case 'list':
      return {
        label: node.ordered ? 'ol' : 'ul',
        children: await Promise.all((node.children ?? []).map(child => listItemNode(child, ctx)))
      }
    case 'blockquote':
      return { label: 'blockquote', children: await blockNodes(node.children ?? [], ctx) }
    case 'thematicBreak':
      return { label: 'hr' }
    case 'code': {
      const code = node.value ?? ''
      const lang = node.lang ?? ''
      const codeFile = codeFileOf(code, extensionOf(lang, ctx.file))
      ctx.codeFiles.set(codeFile.path, codeFile)
      const content = await highlight(code, lang, ctx.file)
      return {
        label: 'codeblock',
        lang,
        path: codeFile.path,
        content,
        // 只有命中 exec 的语言才带 thunk；其余代码文件照常落盘，只是不会被 import。
        ...(ctx.exec.includes(lang) ? { load: LOAD_MARKER } : {})
      }
    }
    case 'html':
      return { label: 'p', content: node.value ?? '' }
    // 链接定义不产生可见内容，保留它只会让产物里多出一个空节点。
    case 'definition':
      return undefined
    default:
      fail(`${ctx.file}：不支持的 markdown 块结构 \`${node.type}\``)
  }
}

interface ParseContext {
  file: string
  source: string
  exec: readonly string[]
  headings: number
  codeFiles: Map<string, CodeFile>
}

/**
 * markdown → 通用节点树。解析器只认 CommonMark 结构与围栏，不认 frontmatter、不做任何
 * 业务契约（示例小节、API 表、语种）——那些属于宿主。
 */
export async function parseMarkdown(source: string, file: string, options: ParseOptions): Promise<ParsedMarkdown> {
  const tree = prose.parse(source) as unknown as MdNode
  const context: ParseContext = {
    file,
    source,
    exec: options.exec,
    headings: 0,
    codeFiles: new Map()
  }
  const nodes = await blockNodes(tree.children ?? [], context)
  return { nodes, codeFiles: [...context.codeFiles.values()] }
}
