import { toHtml } from 'hast-util-to-html'
import { load } from 'js-yaml'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { fail } from './errors'

export interface SampleBlock {
  title: string
  /** `### 受控值 {#controlled}` 里的显式 id；存在即代表这一条示例要发出可交互组件文件。 */
  id: string | null
  descriptionHtml: string
  react: string
  vue: string
}

export interface ApiTable {
  /** attribute / 事件名 / slot 名 → 中文描述（已渲染成 HTML 片段）。 */
  rows: { name: string; descriptionHtml: string }[]
}

export interface ParsedDoc {
  component: string
  tag: string
  introHtml: string
  samples: SampleBlock[]
  api: { props: ApiTable; events: ApiTable; slots: ApiTable }
}

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
  children?: MdNode[]
  position?: MdPosition
}

const EXAMPLES_SECTION = '示例'
const API_SECTION = 'API'
const API_SUBSECTIONS = { Props: 'props', Events: 'events', Slots: 'slots' } as const

// `mdast-util-frontmatter` 产出的节点类型是格式名本身（`yaml` / `toml`），不是 `frontmatter`。
const FRONTMATTER_TYPES = new Set(['frontmatter', 'yaml', 'toml'])

// 两处解析共用一条管线：parse 出 mdast 做结构判定，同一棵树的子节点再交给 remark-rehype 出 HTML。
const parser = unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])
const prose = unified().use(remarkParse).use(remarkRehype)

function renderInline(nodes: MdNode[]): string {
  // 空集合喂给 hast 会产出没有 children 的 root，toHtml 直接抛，所以先短路。
  if (nodes.length === 0) return ''
  const hast = prose.runSync({ type: 'root', children: nodes } as unknown as Parameters<typeof prose.runSync>[0])
  return toHtml(hast as never, { characterReferences: { useNamedReferences: true } })
}

/** 说明与单元格是手写的一小段 markdown，走同一条 prose 管线，避免文档里出现两套渲染规则。 */
function renderMarkdownInline(text: string): string {
  const tree = prose.parse(text)
  return renderInline((tree.children ?? []) as unknown as MdNode[]).trim()
}

/**
 * 单元格文本用 `textContent` 而不是 `value`：`| \`value\` 与 \`label\` |` 这类写法是
 * 好几个 inlineCode/text 节点拼起来的，只读第一个节点会静默丢掉后半句。
 */
function textContent(node: MdNode): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value ?? ''
  if (node.type === 'break') return ' '
  return (node.children ?? []).map(textContent).join('')
}

interface Section {
  title: string
  id: string | null
  nodes: MdNode[]
  /** 本小节正文在源文件里的字节范围（不含 `###` 那一行），表格按它取原文。 */
  rawStart: number
  rawEnd: number
}

// `### 受控值 {#controlled}`：尾部的花括号锚点既是 live 的开关，也是文件名里的稳定 id。
function splitAnchor(rawTitle: string, file: string): { title: string; id: string | null } {
  const match = rawTitle.match(/^(.*?)\s*\{#([^}]+)\}\s*$/)
  if (!match) return { title: rawTitle.trim(), id: null }
  const id = match[2].trim()
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)$|^[a-z0-9]+$/.test(id))
    fail(`${file}：示例锚点 \`{#${id}}\` 必须是 kebab-case 的小写字母数字加连字符`)
  return { title: match[1].trim(), id }
}

/**
 * API 表按原文行读取，不走 mdast。
 *
 * 原因不是「remark 读不了表」，而是本仓还没被授权引入 `remark-gfm`：表格是 GFM 扩展，
 * 不在 CommonMark 里，`remark-parse` 会把整张表当成一个段落。这里要的只是 `| 名称 | 说明 |`
 * 这一种两列表，用行读取足够，而且与旧 `scripts/` 实现同口径、不会改变现有 30 篇的解析结果。
 * 拿到授权后把本函数删掉，换成 `.use(remarkGfm)` 读 `table` 节点。
 */
function readTableLines(body: string): string[][] {
  const rows: string[][] = []
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())
    // 分隔行 `| --- | --- |` 不是数据。
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue
    rows.push(cells)
  }
  return rows
}

// 名字列写成 `` `variant` `` 而源码里是裸名字；join 前去掉这层标记。
function stripInlineCode(name: string): string {
  const trimmed = name.trim()
  return trimmed.startsWith('`') && trimmed.endsWith('`') ? trimmed.slice(1, -1).trim() : trimmed
}

function parseApiTable(section: Section, source: string, file: string): ApiTable {
  const rows = readTableLines(source.slice(section.rawStart, section.rawEnd))
  if (rows.length === 0) return { rows: [] }
  const [head, ...rest] = rows
  if (head[0] !== '名称' || head[1] !== '说明')
    fail(`${file}：### ${section.title} 的表头前两列必须是 \`| 名称 | 说明 |\`，收到 ${JSON.stringify(head)}`)
  const out: ApiTable['rows'] = []
  const seen = new Set<string>()
  for (const cells of rest) {
    const name = stripInlineCode(cells[0] ?? '')
    if (!name) fail(`${file}：### ${section.title} 有一行的名称单元格是空的`)
    // 重名行会被 join 静默吞掉一条，表格看起来「全」而实际少一行，所以直接拦下。
    if (seen.has(name)) fail(`${file}：### ${section.title} 里出现重复的字段名 \`${name}\``)
    seen.add(name)
    const descriptionHtml = renderMarkdownInline(cells[1] ?? '')
    if (!descriptionHtml) fail(`${file}：### ${section.title} 里 \`${name}\` 的描述是空的`)
    out.push({ name, descriptionHtml })
  }
  return { rows: out }
}

/**
 * 按 `depth` 级标题把 children 切成小节，并给每节算出正文的源文件字节范围。
 * `end` 是这批 children 覆盖到的最远偏移，用于收尾小节的 rawEnd。
 */
function groupByHeading(
  children: MdNode[],
  depth: number,
  end: number,
  file: string
): { lead: MdNode[]; sections: Section[] } {
  const lead: MdNode[] = []
  const sections: Section[] = []
  let current: Section | null = null
  for (const node of children) {
    if (node.type === 'heading' && node.depth === depth) {
      if (current) current.rawEnd = node.position?.start.offset ?? current.rawEnd
      const anchor = splitAnchor(textContent(node), file)
      current = {
        title: anchor.title,
        id: anchor.id,
        nodes: [],
        rawStart: node.position?.end.offset ?? end,
        rawEnd: end
      }
      sections.push(current)
      continue
    }
    // 更浅的标题（例如 `## API` 里冒出 `#`）终结当前小节，且不属于任何一个分组。
    if (node.type === 'heading' && current && node.depth !== undefined && node.depth < depth) {
      current.rawEnd = node.position?.start.offset ?? current.rawEnd
      current = null
      continue
    }
    if (current) current.nodes.push(node)
    else lead.push(node)
  }
  return { lead, sections }
}

export function parseMarkdown(source: string, file: string): ParsedDoc {
  const tree = parser.parse(source) as unknown as MdNode
  const nodes = (tree.children ?? []).filter(node => !FRONTMATTER_TYPES.has(node.type))
  const { component, tag } = parseFrontmatter(tree.children?.[0], file)
  const bodyEnd = nodes.at(-1)?.position?.end.offset ?? source.length

  const { lead, sections } = groupByHeading(nodes, 2, bodyEnd, file)
  const introHtml = renderInline(lead).trim()
  if (!introHtml) fail(`${file}：第一个 \`##\` 小节之前要有一段中文简介（组件的一句话说明）`)

  const named = new Map<string, Section>()
  for (const section of sections) {
    if (section.title !== EXAMPLES_SECTION && section.title !== API_SECTION)
      // 旧实现是静默丢弃：写一个 `\`## 注意事项\`` 就等于没写。现在直接报，契约只有这两节。
      fail(
        `${file}：不认识的小节 \`## ${section.title}\`；本引擎只消费 \`## ${EXAMPLES_SECTION}\` 与 \`## ${API_SECTION}\``
      )
    if (named.has(section.title)) fail(`${file}：小节 \`## ${section.title}\` 出现多次`)
    named.set(section.title, section)
  }

  const examples = named.get(EXAMPLES_SECTION)
  const exampleGroups = examples ? groupByHeading(examples.nodes, 3, examples.rawEnd, file) : null
  // 与旧实现的「静默丢弃」相反：`### 示例` 之前写正文会直接报。那段文字谁都不渲染，
  // 留着只会让人以为它出现在页面上。
  if (exampleGroups?.lead.length)
    fail(`${file}：\`## ${EXAMPLES_SECTION}\` 里第一个 \`###\` 之前有正文，这段内容不会被渲染：把它并进某个示例小节`)
  const samples: SampleBlock[] = []
  const ids = new Set<string>()
  for (const sub of exampleGroups ? exampleGroups.sections : []) {
    const fences = sub.nodes.filter(node => node.type === 'code')
    for (const fence of fences) {
      if (fence.lang !== 'react' && fence.lang !== 'vue')
        fail(`${file}：示例「${sub.title}」里的代码块语言必须是 react 或 vue，收到 \`${fence.lang ?? '(无)'}\``)
      if (fence.meta)
        fail(
          `${file}：示例「${sub.title}」的 \`\`\`${fence.lang} 带了未支持的元信息 \`${fence.meta}\`；示例 id 写在 ### 标题的 {#id} 里`
        )
    }
    const react = fences.filter(fence => fence.lang === 'react')
    const vue = fences.filter(fence => fence.lang === 'vue')
    if (react.length !== 1 || vue.length !== 1)
      fail(
        `${file}：示例「${sub.title}」必须各有一个 react 与一个 vue 代码块，收到 react=${react.length} vue=${vue.length}`
      )
    if (sub.id) {
      if (ids.has(sub.id)) fail(`${file}：示例 id \`#${sub.id}\` 重复，落盘文件名会撞车`)
      ids.add(sub.id)
    }
    samples.push({
      title: sub.title,
      id: sub.id,
      descriptionHtml: renderInline(sub.nodes.filter(node => node.type !== 'code')).trim(),
      react: react[0].value ?? '',
      vue: vue[0].value ?? ''
    })
  }
  if (samples.length === 0) fail(`${file}：\`## ${EXAMPLES_SECTION}\` 小节里至少要有一个 \`### 示例\``)

  const apiBody = named.get(API_SECTION)
  const apiSections = apiBody ? groupByHeading(apiBody.nodes, 3, apiBody.rawEnd, file) : null
  for (const section of apiSections?.sections ?? []) {
    if (!(section.title in API_SUBSECTIONS))
      fail(`${file}：API 小节里出现了不认识的名字 \`### ${section.title}\`，只允许 Props / Events / Slots`)
  }
  const apiTable = (name: keyof typeof API_SUBSECTIONS): ApiTable => {
    const section = apiSections?.sections.find(candidate => candidate.title === name)
    return section ? parseApiTable(section, source, file) : { rows: [] }
  }

  return {
    component,
    tag,
    introHtml,
    samples,
    api: { props: apiTable('Props'), events: apiTable('Events'), slots: apiTable('Slots') }
  }
}

function parseFrontmatter(node: MdNode | undefined, file: string): { component: string; tag: string } {
  if (!node || !FRONTMATTER_TYPES.has(node.type) || !node.value?.trim())
    fail(`${file}：缺少 frontmatter（--- 包裹的 component / tag）`)
  let data: unknown
  try {
    data = load(node.value)
  } catch (error) {
    return fail(`${file}：frontmatter 不是合法 YAML：${error instanceof Error ? error.message : String(error)}`)
  }
  if (!data || typeof data !== 'object' || Array.isArray(data))
    fail(`${file}：frontmatter 必须是键值映射，收到 ${JSON.stringify(data)}`)
  const fields = data as Record<string, unknown>
  const component = fields.component
  const tag = fields.tag
  if (typeof component !== 'string' || typeof tag !== 'string' || !component || !tag)
    fail(`${file}：frontmatter 必须同时声明 component 与 tag 两个非空字符串，收到 ${JSON.stringify(fields)}`)
  return { component, tag }
}
