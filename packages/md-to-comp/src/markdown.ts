import { toHtml } from 'hast-util-to-html'
import { load } from 'js-yaml'
import remarkFrontmatter from 'remark-frontmatter'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

import { braceAnchor } from './anchor'
import { fail } from './errors'
import type { ApiColumnKind, ExampleApiColumn, ExampleApiSection } from './render'
import type { MdToCompConfig } from './types'

export interface SampleBlock {
  title: string
  /** 示例标题里的显式锚点 id；存在即代表这一条示例要落成可交互的组件文件。 */
  id: string | null
  descriptionHtml: string
  /** 围栏语言 → 围栏原文。键集就是配置的 flavors。 */
  fences: Record<string, string>
}

export interface ParsedDoc {
  component: string
  tag: string
  introHtml: string
  samples: SampleBlock[]
  api: ExampleApiSection[]
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

/** 文档骨架：这两节的名字、以及 `###` 是示例小节，都是本引擎的约定，不随宿主改。 */
const SAMPLES_SECTION = '示例'
const API_SECTION = 'API'

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
  /** 标题原文，`{#id}` 尾巴还在。 */
  rawTitle: string
  /** 去锚点、去空白之后的标题。 */
  title: string
  nodes: MdNode[]
  /** 本小节正文在源文件里的字节范围（不含 `###` 那一行），表格按它取原文。 */
  rawStart: number
  rawEnd: number
}

/** 锚点成了落盘文件名，所以合法性是引擎的判据，不归锚点函数管。 */
function anchorId(raw: string, title: string, file: string): string {
  const id = raw.trim()
  if (!id) fail(`${file}：示例「${title}」的锚点 id 是空的`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
    fail(`${file}：示例「${title}」的锚点 id \`${id}\` 必须是 kebab-case 的小写字母数字加连字符`)
  return id
}

/**
 * API 表按原文行读取，不走 mdast。原因不是 remark 读不了表，而是表格是 GFM 扩展、不在 CommonMark 里，
 * 本仓还没被授权引入 `remark-gfm`：`remark-parse` 会把整张表当成一个段落。这里要的只有配置里那几张表，
 * 行读取足够。拿到授权后把这两个函数删掉，换成 `.use(remarkGfm)` 读 `table` 节点。
 */
function readTableLines(body: string): string[][] {
  const rows: string[][] = []
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = splitCells(trimmed)
    // 分隔行 `| --- | --- |` 不是数据。
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue
    rows.push(cells)
  }
  return rows
}

/**
 * 按未转义的 `|` 切单元格，并把 `\|` 还原成字面竖线——与 GFM 同一条规则。
 * 手写表格之后类型列要能写出 `'primary' | 'ghost'` 这种联合类型，不转义就会被当成列边界。
 */
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

// 名称、类型与默认值都写成 `` `value` `` 而产物里是裸字符串；入表前去掉这层标记。
function stripInlineCode(name: string): string {
  const trimmed = name.trim()
  return trimmed.startsWith('`') && trimmed.endsWith('`') ? trimmed.slice(1, -1).trim() : trimmed
}

/**
 * 列形状按位置定：首列是行的身份、次列是富文本说明、其余列都是普通值列。标签本身由配置给，
 * 所以「表头写歪了」逐字比对就能判死；渲染端只按 `kind` 上样式，不用认识任何一节叫什么。
 */
function columnsOf(labels: readonly string[], section: string, file: string): ExampleApiColumn[] {
  if (labels.length < 2) fail(`${file}：### ${section} 的表头至少要两列（名称、说明），收到 ${labels.length} 列`)
  return labels.map((title, index) => {
    const kind: ApiColumnKind = index === 0 ? 'name' : index === 1 ? 'html' : 'code'
    return { title, kind }
  })
}

function parseTable(section: Section, labels: readonly string[], source: string, file: string): string[][] {
  const body = source.slice(section.rawStart, section.rawEnd)
  // 小节正文只允许表格行：漏了行首 `|` 的那几行既读不成表格、又不会报错，实测能把 14 行截成 2 行。
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('|'))
      fail(`${file}：### ${section.title} 的正文里有一行不是表格行（每行的行首要写 \`|\`）：${trimmed.slice(0, 40)}`)
  }
  const rows = readTableLines(body)
  // 只有标题、没有表格行：这一形状从前一路走到「这一节不存在」，而表格现在是这份契约的唯一来源，
  // 所以它必须是错误，而不是产物里少一张表。
  if (rows.length < 2)
    fail(`${file}：### ${section.title} 有标题但没有表格（表头加至少一行数据）；这张表不该存在就删掉这个小节标题`)
  const [head, ...rest] = rows
  if (head.length !== labels.length || head.some((cell, index) => cell !== labels[index]))
    fail(`${file}：### ${section.title} 的表头必须是 \`| ${labels.join(' | ')} |\`，收到 ${JSON.stringify(head)}`)
  const out: string[][] = []
  const seen = new Set<string>()
  for (const cells of rest) {
    // 不核对列数，多出来的一节就会被读成「不存在」——写歪一个未转义的竖线等于那段话没写。
    if (cells.length !== labels.length)
      fail(
        `${file}：### ${section.title} 有一行是 ${cells.length} 列，表头是 ${labels.length} 列：${JSON.stringify(cells)}`
      )
    const name = stripInlineCode(cells[0] ?? '')
    if (!name) fail(`${file}：### ${section.title} 有一行的名称单元格是空的`)
    // 重名行会在渲染时撞 key，而且第二行的描述会被当成没写。
    if (seen.has(name)) fail(`${file}：### ${section.title} 里出现重复的字段名 \`${name}\``)
    seen.add(name)
    const descriptionHtml = renderMarkdownInline(cells[1] ?? '')
    if (!descriptionHtml) fail(`${file}：### ${section.title} 里 \`${name}\` 的描述是空的`)
    // 值列（第 3 列起）是表格仅有的来源，空单元格只能报错，不能渲染成一个看起来像内容的空列。
    const values = cells.slice(2).map((cell, index) => {
      const value = stripInlineCode(cell)
      if (!value)
        fail(`${file}：### ${section.title} 里 \`${name}\` 的「${labels[index + 2]}」列是空的（无值写 \`—\`）`)
      return value
    })
    out.push([name, descriptionHtml, ...values])
  }
  return out
}

/**
 * 表头没在配置里登记过的小节按散文处理：正文整段渲染成 HTML。正文里出现表格行说明这一段本该是表，
 * 只是它的形状没登记——那不是散文，直接报错；否则表头写歪一个小节就会静默退化成一段带竖线的文字。
 */
function parseProse(section: Section, source: string, file: string): string {
  const body = source.slice(section.rawStart, section.rawEnd)
  for (const line of body.split('\n'))
    if (line.trim().startsWith('|'))
      fail(`${file}：### ${section.title} 是散文小节，正文里却有表格行；表格的形状要在 apiTables 里声明`)
  const html = renderInline(section.nodes).trim()
  if (!html) fail(`${file}：### ${section.title} 是空的：要么写正文，要么删掉这个小节标题`)
  return html
}

/**
 * 按 `depth` 级标题把 children 切成小节，并给每节算出正文的源文件字节范围。
 * `titleOf` 决定标题取哪一部分（顶层小节去掉可能存在的锚点尾巴，示例小节按宿主的锚点函数取）。
 * `end` 是这批 children 覆盖到的最远偏移，用于收尾小节的 rawEnd。
 */
function groupByHeading(
  children: MdNode[],
  depth: number,
  end: number,
  titleOf: (raw: string) => string
): { lead: MdNode[]; sections: Section[] } {
  const lead: MdNode[] = []
  const sections: Section[] = []
  let current: Section | null = null
  for (const node of children) {
    if (node.type === 'heading' && node.depth === depth) {
      if (current) current.rawEnd = node.position?.start.offset ?? current.rawEnd
      const rawTitle = textContent(node)
      current = {
        rawTitle,
        title: titleOf(rawTitle),
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

type ParseConfig = Pick<MdToCompConfig, 'anchor' | 'flavors' | 'apiTables'>

export function parseMarkdown(source: string, file: string, config: ParseConfig): ParsedDoc {
  const anchorOf = config.anchor ?? braceAnchor
  const tree = parser.parse(source) as unknown as MdNode
  const nodes = (tree.children ?? []).filter(node => !FRONTMATTER_TYPES.has(node.type))
  const { component, tag } = parseFrontmatter(tree.children?.[0], file)
  const bodyEnd = nodes.at(-1)?.position?.end.offset ?? source.length

  const terse = (raw: string) => anchorOf(raw).title
  const { lead, sections } = groupByHeading(nodes, 2, bodyEnd, terse)
  const introHtml = renderInline(lead).trim()
  if (!introHtml) fail(`${file}：第一个 \`##\` 小节之前要有一段中文简介（组件的一句话说明）`)

  const named = new Map<string, Section>()
  for (const section of sections) {
    if (section.title !== SAMPLES_SECTION && section.title !== API_SECTION)
      // 旧实现是静默丢弃：写一个 `\`## 注意事项\`` 就等于没写。现在直接报，契约只有这两节。
      fail(
        `${file}：不认识的小节 \`## ${section.title}\`；本引擎只消费 \`## ${SAMPLES_SECTION}\` 与 \`## ${API_SECTION}\``
      )
    if (named.has(section.title)) fail(`${file}：小节 \`## ${section.title}\` 出现多次`)
    named.set(section.title, section)
  }

  const samplesSection = named.get(SAMPLES_SECTION)
  const sampleGroups = samplesSection ? groupByHeading(samplesSection.nodes, 3, samplesSection.rawEnd, terse) : null
  // 与旧实现的「静默丢弃」相反：`### 示例` 之前写正文会直接报。那段文字谁都不渲染，
  // 留着只会让人以为它出现在页面上。
  if (sampleGroups?.lead.length)
    fail(`${file}：\`## ${SAMPLES_SECTION}\` 里第一个 \`###\` 之前有正文，这段内容不会被渲染：把它并进某个示例小节`)

  const samples: SampleBlock[] = []
  const ids = new Set<string>()
  for (const sub of sampleGroups ? sampleGroups.sections : []) {
    if (!sub.title) fail(`${file}：\`## ${SAMPLES_SECTION}\` 里有一个 \`###\` 标题是空的`)
    const id = anchorOf(sub.rawTitle).id
    const fences = sub.nodes.filter(node => node.type === 'code')
    for (const fence of fences) {
      if (!(config.flavors as readonly string[]).includes(fence.lang ?? ''))
        fail(
          `${file}：示例「${sub.title}」里的代码块语言必须是 ${config.flavors.join(' / ')}，收到 \`${fence.lang ?? '(无)'}\``
        )
      if (fence.meta)
        fail(
          `${file}：示例「${sub.title}」的 \`\`\`${fence.lang} 带了未支持的元信息 \`${fence.meta}\`；示例 id 写在 ### 标题里`
        )
    }
    const fencesByFlavor: Record<string, string> = {}
    const counts: Record<string, number> = {}
    for (const flavor of config.flavors) {
      const matched = fences.filter(fence => fence.lang === flavor)
      counts[flavor] = matched.length
      fencesByFlavor[flavor] = matched[0]?.value ?? ''
    }
    if (config.flavors.some(flavor => counts[flavor] !== 1))
      fail(
        `${file}：示例「${sub.title}」必须为每个 flavor 各有一个代码块（${config.flavors.join(' / ')}），收到 ${JSON.stringify(counts)}`
      )
    if (id !== null) {
      const checked = anchorId(id, sub.title, file)
      if (ids.has(checked)) fail(`${file}：示例 id \`#${checked}\` 重复，落盘文件名会撞车`)
      ids.add(checked)
    }
    samples.push({
      title: sub.title,
      id: id === null ? null : id.trim(),
      descriptionHtml: renderInline(sub.nodes.filter(node => node.type !== 'code')).trim(),
      fences: fencesByFlavor
    })
  }
  if (samples.length === 0) fail(`${file}：\`## ${SAMPLES_SECTION}\` 小节里至少要有一个 \`### 示例\``)

  const columns = config.apiTables.columns
  const apiBody = named.get(API_SECTION)
  const api: ExampleApiSection[] = []
  // `## API` 整段省略 = 这个组件没有对外契约（纯展示的分隔线就是这一型）。整节删掉是一个能 review 的
  // 明确动作，所以它是合法的声明；而「留着标题却没有小节」只会在页面上渲染成一个空标题，等于那段话
  // 没写——小节一旦存在，就必须有内容。
  if (apiBody) {
    const apiSections = groupByHeading(apiBody.nodes, 3, apiBody.rawEnd, terse)
    // 与 `## 示例` 同一条规矩：`###` 之前那段正文谁都不渲染。
    if (apiSections.lead.length)
      fail(`${file}：\`## ${API_SECTION}\` 里第一个 \`###\` 之前有正文，这段内容不会被渲染：把它并进某个小节`)
    const seen = new Set<string>()
    // 顺序即正文里 `###` 出现的顺序：小节放在哪是作者的事，配置只管表头与列形状。
    for (const section of apiSections.sections) {
      if (!section.title) fail(`${file}：\`## ${API_SECTION}\` 里有一个 \`###\` 标题是空的`)
      // 标题转小写成了 DOM 上的标记，撞车会让两节在渲染时共用同一个 key。
      const key = section.title.toLowerCase()
      if (seen.has(key)) fail(`${file}：\`## ${API_SECTION}\` 里小节 \`### ${section.title}\` 出现多次`)
      seen.add(key)
      const labels = Object.hasOwn(columns, section.title) ? columns[section.title] : null
      // 表头没在配置里登记过的小节按散文处理，正文照渲染；写歪的表头会被「散文里有表格行」拦下。
      if (!labels) {
        api.push({ kind: 'prose', key, title: section.title, html: parseProse(section, source, file) })
        continue
      }
      api.push({
        kind: 'table',
        key,
        title: section.title,
        columns: columnsOf(labels, section.title, file),
        rows: parseTable(section, labels, source, file)
      })
    }
    if (api.length === 0)
      fail(
        `${file}：\`## ${API_SECTION}\` 里一个小节都没有：要是这个组件没有对外契约，就把这一节连标题一起删掉（留空等于没写）`
      )
  }

  return {
    component,
    tag,
    introHtml,
    samples,
    api
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
