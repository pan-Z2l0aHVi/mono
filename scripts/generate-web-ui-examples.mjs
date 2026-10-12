#!/usr/bin/env node
// generate-web-ui-examples.mjs — 由 markdown 与 web-ui 组件源码生成两个 demo 的「示例代码 + API 表」数据。
//
// source of truth 有两份，各管一件事，缺一份就报错而不是猜：
//
//   - `docs/examples/web-ui/*.md`                  示例代码、中文说明、API 描述文案
//   - `packages/web-ui/src/components/*/index.ts`  props / events / slots 的名字、类型、默认值
//
// markdown 决定「有哪些示例、每个示例的代码是什么、每个 API 字段怎么描述」；组件源码决定
// 「有哪些 props / events / slots、类型与默认值是什么」。两份在生成器里按名字 join：
// markdown 写了源码里没有的字段、或源码里的字段没有描述，都以非零退出失败——表格与组件漂移
// 是这条生成器要挡的主要形状，所以两侧都不允许「默默补上」。
//
// 生成物受版本控制，与生成器输出的一致性由 `scripts/generate-web-ui-examples.test.mjs`
// 断言（跑在 `ci:test-scripts` 里，因此也在 CI 的 `check` 里）。
//
// 用法：`node scripts/generate-web-ui-examples.mjs [--check]`
//   --check  只比对不写入，输出不一致时非零退出。

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOCS_DIR = path.join(root, 'docs', 'examples', 'web-ui')
const COMPONENTS_DIR = path.join(root, 'packages', 'web-ui', 'src', 'components')
const OUTPUTS = [
  path.join(root, 'apps', 'react-web-ui-demo', 'src', 'generated'),
  path.join(root, 'apps', 'vue-web-ui-demo', 'src', 'generated')
]

// ── markdown 解析 ─────────────────────────────────────────────────────────────

function fail(message) {
  console.error(`generate-web-ui-examples: ${message}`)
  process.exit(1)
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) fail('markdown 文件缺少 frontmatter（--- 包裹的 component / tag 两行）')
  const data = {}
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':')
    data[key.trim()] = rest.join(':').trim()
  }
  if (!data.component || !data.tag) fail(`frontmatter 必须同时声明 component 与 tag：${match[1]}`)
  return { data, body: source.slice(match[0].length) }
}

// 把 markdown 正文切成 `## 顶级小节`，返回 { 小节标题: 正文 }。
function splitSections(body) {
  const sections = new Map()
  let title = null
  let buffer = []
  const flush = () => {
    if (title !== null) sections.set(title, buffer.join('\n'))
    buffer = []
  }
  for (const line of body.split('\n')) {
    const match = line.match(/^##\s+(.+?)\s*$/)
    if (match) {
      flush()
      title = match[1]
      continue
    }
    if (title !== null) buffer.push(line)
  }
  flush()
  return sections
}

// 从一个 `##` 小节里切出 `### 三级小节`，返回 [{ title, body }]。
function splitSubsections(sectionBody) {
  const out = []
  let title = null
  let buffer = []
  const flush = () => {
    if (title !== null) out.push({ title, body: buffer.join('\n') })
    buffer = []
  }
  for (const line of sectionBody.split('\n')) {
    const match = line.match(/^###\s+(.+?)\s*$/)
    if (match) {
      flush()
      title = match[1]
      continue
    }
    if (title !== null) buffer.push(line)
  }
  flush()
  return out
}

// 反引号不能直接写进正则字面量：写盘管道会把连续反引号当成 markdown 围栏而改写同一行。
// 所以围栏标记用 charCode 拼出来，这里只做字符串比较。
const BACKTICK = String.fromCharCode(96)
const FENCE_MARK = BACKTICK.repeat(3)

// 从一个三级小节里取出带语言标记的代码块，返回 { lang, code }。
// 只有 `react` 与 `vue` 两种语言被接受：两个 demo 各消费自己那一份，缺一个就报。
function parseFences(body) {
  const fences = []
  let lang = null
  let code = []
  for (const line of body.split('\n')) {
    if (line.startsWith(FENCE_MARK)) {
      if (lang === null) {
        lang = line.slice(FENCE_MARK.length).trim() || null
        code = []
        continue
      }
      fences.push({ lang, code: code.join('\n') })
      lang = null
      code = []
      continue
    }
    if (lang !== null) code.push(line)
  }
  if (lang !== null) fail(`代码块没有闭合的 ${FENCE_MARK}：${body.slice(0, 60)}…`)
  return fences
}

// 从一个三级小节里取出 markdown 表格，返回 [{ cells }]（已去掉分隔行）。
function parseTable(body) {
  const rows = []
  for (const line of body.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('|')) continue
    const cells = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())
    if (cells.every(cell => /^:?-{2,}:?$/.test(cell))) continue
    rows.push(cells)
  }
  return rows
}

// API 描述表：`| 名称 | 说明 |`，第一行是表头。返回 Map<名称, 说明>。
function parseApiTable(body, path) {
  const rows = parseTable(body)
  if (rows.length === 0) return new Map()
  const [head, ...rest] = rows
  if (head[0] !== '名称' || head[1] !== '说明')
    fail(`${path}：API 描述表的第一行必须是 \`| 名称 | 说明 |\`，收到 ${JSON.stringify(head)}`)
  const entries = rest.map(cells => [stripInlineCode(cells[0]), cells[1] ?? ''])
  // 重名行会被 Map 静默吞掉一条，表格看起来「全」而实际少了一行，所以在这里直接拦下。
  const seen = new Set()
  for (const [name] of entries) {
    if (seen.has(name)) fail(`${path}：API 描述表里出现重复的字段名 \`${name}\``)
    seen.add(name)
  }
  return new Map(entries)
}

// markdown 里的字段名习惯写成 `` `variant` ``，源码里是裸名字；join 前统一去掉这层标记。
function stripInlineCode(name) {
  const trimmed = name.trim()
  return trimmed.startsWith('`') && trimmed.endsWith('`') ? trimmed.slice(1, -1).trim() : trimmed
}

function parseMarkdown(file) {
  const source = readFileSync(file, 'utf8')
  const { data, body } = parseFrontmatter(source)
  const firstSection = body.search(/^##\s+/m)
  const intro = (firstSection === -1 ? body : body.slice(0, firstSection)).trim()
  if (!intro) fail(`${file}：第一个 \`##\` 小节之前要有一段中文简介（组件的一句话说明）`)
  const sections = splitSections(body.slice(firstSection === -1 ? body.length : firstSection))

  const examples = []
  for (const { title, body: sampleBody } of splitSubsections(sections.get('示例') ?? '')) {
    const fences = parseFences(sampleBody)
    for (const fence of fences)
      if (fence.lang !== 'react' && fence.lang !== 'vue')
        fail(`${file}：示例「${title}」里的代码块语言必须是 react 或 vue，收到 \`${fence.lang ?? '(无)'}\``)
    const react = fences.filter(fence => fence.lang === 'react')
    const vue = fences.filter(fence => fence.lang === 'vue')
    if (react.length !== 1 || vue.length !== 1)
      fail(
        `${file}：示例「${title}」必须各有一个 react 与一个 vue 代码块，收到 react=${react.length} vue=${vue.length}`
      )
    examples.push({
      title,
      description: stripCode(sampleBody, fences).trim(),
      react: react[0].code,
      vue: vue[0].code
    })
  }
  if (examples.length === 0) fail(`${file}：「## 示例」小节里至少要有一个 ### 示例`)

  const apiBody = sections.get('API') ?? ''
  const api = {
    props: parseSubsectionTable(apiBody, 'Props', file),
    events: parseSubsectionTable(apiBody, 'Events', file),
    slots: parseSubsectionTable(apiBody, 'Slots', file)
  }

  return { component: data.component, tag: data.tag, intro, examples, api }
}

function parseSubsectionTable(apiBody, name, file) {
  const subsections = splitSubsections(apiBody).filter(({ title }) => title === name)
  if (subsections.length === 0) return new Map()
  if (subsections.length > 1) fail(`${file}：API 小节里出现多个「### ${name}」`)
  return parseApiTable(subsections[0].body, `${file} 的 ### ${name}`)
}

// 把代码块之外的正文取出来，作为示例的中文说明。
function stripCode(body, fences) {
  let text = body
  for (const fence of fences) {
    text = text.replace(`\`\`\`${fence.lang}\n${fence.code}\n\`\`\``, '')
  }
  return text
}

// ── 组件源码解析 ───────────────────────────────────────────────────────────────

// 装饰器后面紧跟声明，所以行尾允许有内容；`([\s\S]*?)` 在第一个右括号处收。
const PROP_DECORATOR = /^\s*@property\(([\s\S]*?)\)/

// 把 `@property({ type: String, reflect: true, attribute: 'show-zero' })` 的选项读成对象。
// 选项在本仓恒为单行字面量；跨行时按括号配平续读，失败就报错而不是猜一个残缺对象。
// 返回 { options, end }，end 是装饰器结束的那一行下标。
function readDecoratorOptions(lines, start) {
  let text = ''
  let depth = 0
  let closed = false
  let end = start
  let trailing = ''
  for (let index = start; index < lines.length; index += 1) {
    for (let position = 0; position < lines[index].length; position += 1) {
      const char = lines[index][position]
      if (char === '(') {
        depth += 1
        continue
      }
      // 只有见过左括号之后才算闭合，否则行首的空格会被当成「已经闭合」。
      if (char === ')' && depth > 0) {
        depth -= 1
        if (depth === 0) {
          closed = true
          trailing = lines[index].slice(position + 1).trim()
          break
        }
        continue
      }
      if (depth > 0) text += char
    }
    end = index
    if (closed) break
    text += '\n'
  }
  if (!closed) fail(`@property 装饰器没有闭合：${lines[start]}`)
  const options = {}
  for (const match of text.matchAll(/(\w+):\s*('([^']*)'|true|false|null)/g)) {
    options[match[1]] = match[3] ?? (match[2] === 'true' ? true : match[2] === 'false' ? false : null)
  }
  const type = text.match(/type:\s*(\w+)/)
  if (type) options.type = type[1]
  return { options, end, trailing }
}

// 把 `typeof ALLOWED_TYPES[number]` 这类字面量 union 展开成源码里的字面量列表。
// 找不到常量定义就原样返回：类型列宁可显示源码形态，也不要显示一个猜出来的值。
// Lit 装饰器里的 `type:` 是运行时序列化类型，不是 TS 类型；只在没有类型注解时当兜底。
const LIT_TYPE_TO_TS = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Array: 'unknown[]',
  Object: 'Record<string, unknown>'
}

function resolveTypeExpression(expression, literals) {
  const text = expression.trim()
  const arrayIndex = text.match(/^\(?typeof\s+([A-Za-z_$][\w$]*)\)?\[number\]$/)
  if (arrayIndex) {
    const values = literals.get(arrayIndex[1])
    if (values) return values.join(' | ')
    return text
  }
  const plain = text.match(/^typeof\s+([A-Za-z_$][\w$]*)$/)
  if (plain && literals.has(plain[1])) return literals.get(plain[1]).join(' | ')
  return text
}

// 组件入口不一定是 index.ts：有的组件（如 toast）的 index.ts 只做 re-export，
// `@customElement` 落在目录里另一个 .ts。按 index.ts 优先、其余 .ts 兜底的顺序找声明它的文件。
function resolveComponentFile(component) {
  const dir = path.join(COMPONENTS_DIR, component)
  let names
  try {
    names = readdirSync(dir)
  } catch {
    fail(`找不到组件源码 ${dir}——markdown 的 \`component\` 必须对应 packages/web-ui/src/components/ 下的目录`)
  }
  const candidates = names.filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts'))
  if (candidates.includes('index.ts')) candidates.splice(candidates.indexOf('index.ts'), 1)
  candidates.unshift('index.ts')
  for (const name of candidates) {
    if (!names.includes(name)) continue
    const file = path.join(dir, name)
    const source = readFileSync(file, 'utf8')
    const tag = source.match(/@customElement\('([^']+)'\)/)?.[1]
    if (tag) return { file, source, tag }
  }
  fail(`${dir}：没有任何 .ts 声明 @customElement 装饰器`)
}

const MODIFIERS = '(?:(?:public|private|protected|readonly|static|override|declare)\\s+)*'
const IDENTIFIER = '[A-Za-z_$][\\w$]*'
const escapeIdentifier = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// accessor 对可能 `set` 在前、`get` 在后（本仓两种顺序都有），类型跟着 getter 的返回注解；
// 只有 getter 时用 getter，否则退回 setter 的第一个形参类型。名字在整个 class 里检索，
// 不假设 getter 与 setter 紧挨着。
function findAccessorReturnType(lines, property) {
  const pattern = new RegExp(
    `^\\s*${MODIFIERS}get\\s+${escapeIdentifier(property)}\\s*\\([^)]*\\)\\s*:\\s*(.+?)\\s*\\{$`
  )
  for (const line of lines) {
    const match = line.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}

function findAccessorParamType(lines, property) {
  const pattern = new RegExp(
    `^\\s*${MODIFIERS}set\\s+${escapeIdentifier(property)}\\s*\\(\\s*${IDENTIFIER}\\s*\\??\\s*:\\s*([^)]+?)\\s*\\)`
  )
  for (const line of lines) {
    const match = line.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}

// accessor 的默认值是同名私有后备字段的初始值（`private _value = 0`、`@state() private _max = Infinity`）。
// 后备字段可能声明在 accessor 之前或之后，所以同样在整个 class 里按 `_<name>` 精确检索。
function findBackingDefault(lines, property) {
  const pattern = new RegExp(
    `^\\s*(?:@[\\w.]+(?:\\([^)]*\\))?\\s+)*${MODIFIERS}_${escapeIdentifier(property)}\\b\\s*(?::\\s*[^=]+?)?=\\s*(.+?)\\s*$`
  )
  for (const line of lines) {
    const match = line.match(pattern)
    if (match) return match[1].trim()
  }
  return undefined
}

// `const X = <literal>` 与 `import { X } from './y'`：把默认值里的常量名还原成字面量，
// 免得 API 表里出现 `DEFAULT_MARKER` 这种只有源码读得懂的符号。只认字面量，认不出就保留原样。
function collectScalarConstants(file, seen = new Set()) {
  const constants = new Map()
  if (seen.has(file)) return constants
  seen.add(file)
  let source
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    return constants
  }
  for (const match of source.matchAll(
    /^(?:export\s+)?const\s+([A-Z][\w$]*)\s*=\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|true|false)\s*;?\s*$/gm
  ))
    constants.set(match[1], match[2])
  for (const match of source.matchAll(/^import\s*\{([^}]*)\}\s*from\s*'(\.[^']+)'/gm)) {
    const specifier = match[2].replace(/\.js$/, '')
    const candidates = [specifier, `${specifier}.ts`, `${specifier}/index.ts`].map(rel =>
      path.resolve(path.dirname(file), rel)
    )
    const target = candidates.find(candidate => existsSync(candidate))
    if (!target) continue
    const nested = collectScalarConstants(target, seen)
    for (const spec of match[1].split(',')) {
      const [imported, local] = spec.split(/\s+as\s+/).map(part => part.trim())
      if (imported && nested.has(imported)) constants.set(local ?? imported, nested.get(imported))
    }
  }
  return constants
}

function readComponentSource(component) {
  const { file, source, tag } = resolveComponentFile(component)
  const lines = source.split('\n')

  // `const ALLOWED_X = [...] as const` —— 字面量 union 的唯一出处。
  const literals = new Map()
  for (const line of lines) {
    const match = line.match(/^const\s+([A-Z][\w$]*)\s*=\s*\[(.*?)\]\s*as const/)
    if (match)
      literals.set(
        match[1],
        match[2]
          .split(',')
          .map(v => v.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      )
  }

  const props = []
  const seen = new Set()
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.includes('@property(')) continue
    const match = line.match(PROP_DECORATOR)
    if (!match) fail(`${file}：无法解析 @property 装饰器：${line.trim()}`)
    const { options, end, trailing } = readDecoratorOptions(lines, index)
    let next = end + 1
    while (next < lines.length && lines[next].trim() === '') next += 1
    const declaration = (trailing || lines[next] || '').trim()
    if (process.env.DEBUG_PARSE)
      console.error(
        `[debug] index=${index} end=${end} trailing=${JSON.stringify(trailing)} decl=${JSON.stringify(declaration)}`
      )

    const accessorDeclaration = declaration.match(new RegExp(`^${MODIFIERS}(get|set)\\s+(${IDENTIFIER})\\s*\\(`))
    // 字段声明：可选修饰符、可选 `?`、可选类型注解、可选初始值。缺初始值时默认值是 `—`（与源码一致）。
    const fieldDeclaration = declaration.match(
      new RegExp(`^${MODIFIERS}(${IDENTIFIER})\\s*(\\?)?\\s*(?::\\s*([^=]+?))?\\s*(?:=\\s*(.+?))?$`)
    )

    let property
    let type
    let defaultValue
    if (accessorDeclaration) {
      property = accessorDeclaration[2]
      type = resolveTypeExpression(
        findAccessorReturnType(lines, property) ?? LIT_TYPE_TO_TS[options.type] ?? 'unknown',
        literals
      )
      if (type === 'unknown')
        type = resolveTypeExpression(findAccessorParamType(lines, property) ?? 'unknown', literals)
      defaultValue = findBackingDefault(lines, property) ?? '—'
    } else if (fieldDeclaration) {
      property = fieldDeclaration[1]
      type = resolveTypeExpression(fieldDeclaration[3] ?? LIT_TYPE_TO_TS[options.type] ?? 'unknown', literals)
      defaultValue = fieldDeclaration[4]?.trim() ?? '—'
    } else {
      fail(`${file}：@property 之后的声明既不是字段也不是 accessor：${declaration}`)
    }

    // `attribute: false` 的 prop 只能走 property，markdown 里用属性名（camelCase）而不是把它当成 attribute。
    const attribute = options.attribute === false ? property : (options.attribute ?? property.toLowerCase())
    if (seen.has(attribute)) continue
    seen.add(attribute)
    props.push({ attribute, property, type, default: defaultValue, order: index })
  }

  // 有些公共响应式属性不走 `@property`（手动 requestUpdate 的 accessor 对，如 checkbox 的 checked、
  // segmented 的 value）。只收「get + set 成对出现」的公共 accessor：getter-only 是派生态（如
  // `isOpen`、`mobile`），不可写，混进 API 表只会误导。类型取 getter 返回注解，默认值取同名后备字段。
  for (let index = 0; index < lines.length; index += 1) {
    const getter = lines[index].match(new RegExp(`^\\s{2}get\\s+(${IDENTIFIER})\\s*\\(`))
    if (!getter) continue
    const property = getter[1]
    if (property.startsWith('_')) continue
    if (props.some(entry => entry.property === property)) continue
    const setter = new RegExp(`^\\s{2}set\\s+${escapeIdentifier(property)}\\s*\\(`)
    if (!lines.some(line => setter.test(line))) continue
    const attribute = property
    if (seen.has(attribute)) continue
    seen.add(attribute)
    props.push({
      attribute,
      property,
      type: resolveTypeExpression(findAccessorReturnType(lines, property) ?? 'unknown', literals),
      default: findBackingDefault(lines, property) ?? '—',
      order: index
    })
  }

  // 收尾时按源码顺序排列，文档里 props 的次序与 class 里的声明一致。
  props.sort((a, b) => a.order - b.order)
  for (const entry of props) delete entry.order

  const scalarConstants = collectScalarConstants(file)
  for (const entry of props) {
    if (/^[A-Z][\w$]*$/.test(entry.default) && scalarConstants.has(entry.default))
      entry.default = scalarConstants.get(entry.default)
    if (entry.type === 'unknown' && entry.default !== '—') {
      // 没有类型注解也没有 Lit `type:` 时，TS 会从字面量初始值推断；照同一规则补上，别写 unknown。
      if (entry.default === 'true' || entry.default === 'false') entry.type = 'boolean'
      else if (/^-?\d/.test(entry.default)) entry.type = 'number'
      else if (/^['"]/.test(entry.default)) entry.type = 'string'
    }
  }

  const events = []
  const eventsBlock = source.match(/declare readonly \$events:\s*\{([\s\S]*?)\n  \}/)
  if (eventsBlock) {
    // 事件名两种写法都有：带连字符的必须引号（`'open-change': ...`），标识符形态的不带（`input: Event`）。
    for (const line of eventsBlock[1].split('\n')) {
      const match = line.match(/^\s*'?([\w-]+)'?\s*:\s*(.+?)\s*$/)
      if (match) events.push({ name: match[1], type: match[2] })
    }
  }

  const slots = []
  // slot 标签的属性顺序与增删都会变（`<slot name="prefix" class=... @slotchange=...>`），
  // 只能按 `<slot` 起、`>` 止取整段再找 `name`，不能假设 name 紧贴标签名。
  for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
    const name = match[1].match(/\bname="([^"]+)"/)?.[1] ?? 'default'
    if (!slots.some(slot => slot.name === name)) slots.push({ name })
  }

  return { tag, props, events, slots }
}

// ── join：markdown 描述 × 源码契约 ─────────────────────────────────────────────

function joinApi(kind, contract, descriptions, file) {
  const rows = []
  for (const entry of contract) {
    const name = kind === 'props' ? entry.attribute : entry.name
    const description = descriptions.get(name)
    if (description === undefined)
      fail(
        `${file}：${kind}「${name}」存在于组件源码但 markdown 的 ### ${kind} 表里没有描述行。` +
          `要么补上描述，要么把它从源码里去掉——不静默留空`
      )
    if (!description.trim()) fail(`${file}：${kind}「${name}」的描述是空字符串`)
    rows.push(
      kind === 'props'
        ? { name, type: entry.type, default: entry.default, description }
        : { name, type: entry.type, description }
    )
  }
  for (const name of descriptions.keys()) {
    const known = contract.map(entry => (kind === 'props' ? entry.attribute : entry.name))
    if (!known.includes(name))
      fail(`${file}：${kind}「${name}」写在 markdown 里，但组件源码里没有这个 ${kind}——表格在漂移`)
  }
  return rows
}

// ── 代码高亮 ─────────────────────────────────────────────────────────────────
// 零依赖的高亮器：本仓没有也不允许为「示例代码着色」引入 markdown / highlighting 依赖，
// 所以这里带一个覆盖 TSX / Vue SFC / CSS 的小状态机。它只做词法着色，不做语义分析，
// 因此对未知语法一律退回明文——错着色比不着色更难发现。

const KEYWORDS = new Set([
  'abstract',
  'as',
  'async',
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'declare',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'namespace',
  'new',
  'of',
  'private',
  'protected',
  'public',
  'readonly',
  'return',
  'satisfies',
  'set',
  'static',
  'switch',
  'throw',
  'try',
  'type',
  'typeof',
  'var',
  'void',
  'while',
  'yield'
])
const LITERALS = new Set(['false', 'Infinity', 'NaN', 'null', 'true', 'undefined'])
const BUILTINS = new Set([
  'CustomEvent',
  'Date',
  'Error',
  'Event',
  'FocusEvent',
  'HTMLElement',
  'HTMLInputElement',
  'JSON',
  'Math',
  'Object',
  'Promise',
  'React',
  'Record',
  'RegExp',
  'Set',
  'String',
  'Array',
  'Boolean',
  'Number',
  'console',
  'document',
  'ref',
  'useCallback',
  'useEffect',
  'useMemo',
  'useRef',
  'useState',
  'window',
  'any',
  'boolean',
  'never',
  'number',
  'string',
  'unknown'
])
const REGEX_PRECEDERS = new Set([
  '(',
  '[',
  '{',
  ',',
  ';',
  ':',
  '=',
  '!',
  '&',
  '|',
  '?',
  '+',
  '-',
  '*',
  '%',
  '^',
  '~',
  '<',
  '>'
])

// 从 `{` 起找配对 `}` 的下标（跳过字符串字面量）。找不到返回 -1，调用方据此报错而不是截断。
// 只做花括号配平：示例代码里的表达式没有正则字面量或注释里带花括号的形态，遇到就直接报错。
function closingBraceIndex(text) {
  let depth = 0
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (char === "'" || char === '"' || char === BACKTICK) {
      index += 1
      while (index < text.length && text[index] !== char) {
        if (text[index] === '\\') index += 1
        index += 1
      }
      continue
    }
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function tokenizeJsx(code) {
  const tokens = []
  const stack = ['js']
  let index = 0
  let prev = null
  let atStart = true
  let afterOpenTag = false
  const mode = () => stack[stack.length - 1]
  const push = (type, value) => {
    tokens.push({ type, value })
    prev = { type, value }
  }
  // 只做匹配，不推进入口：调用方各自 `index += 长度`，早先这里也推进了一次，
  // 于是空白/字符串/标点都被跳过了双倍长度，表现是「部分字符凭空消失」。
  const eat = regex => code.slice(index).match(regex)
  const startsTag = () => /^[A-Za-z/_>]/.test(code.slice(index + 1))

  while (index < code.length) {
    const rest = code.slice(index)
    if (mode() === 'tag') {
      const space = eat(/^\s+/)
      if (space) {
        // 属性之间的空白是代码的一部分，必须原样保留，否则渲染出来是 `<tagattr="x">`。
        push('text', space[0])
        index += space[0].length
        continue
      }
      if (rest.startsWith('/>')) {
        index += 2
        stack.pop()
        afterOpenTag = false
        push('punct', '/>')
        continue
      }
      if (rest.startsWith('>')) {
        index += 1
        stack.pop()
        const closing = prev?.type === 'punct' && prev.value === '/'
        afterOpenTag = !closing
        push('punct', '>')
        continue
      }
      if (rest.startsWith('{')) {
        index += 1
        stack.push('js')
        afterOpenTag = false
        push('punct', '{')
        continue
      }
      if (rest.startsWith('=')) {
        index += 1
        push('punct', '=')
        continue
      }
      const attr = eat(/^[A-Za-z_$][\w$-]*/)
      if (attr) {
        const isTagName = prev === null || (prev.type === 'punct' && (prev.value === '<' || prev.value === '/'))
        push(isTagName ? 'tag' : 'attr', attr[0])
        index += attr[0].length
        continue
      }
      if (rest.startsWith('/')) {
        push('punct', '/')
        index += 1
        continue
      }
      const str = eat(/^'[^']*'|^"[^"]*"/)
      if (str) {
        push('string', str[0])
        index += str[0].length
        continue
      }
      if (rest.startsWith('}')) {
        index += 1
        stack.pop()
        push('punct', '}')
        continue
      }
      push('plain', rest[0])
      index += 1
      continue
    }

    if (mode() === 'text') {
      // 文本子节点里 `<` 一律当标签开头、`{` 一律当 JSX 表达式，其余原样成文本。
      // 表达式要走 js 词法器，否则 `{Array.from(...)}` 会整段漏过高亮（只因为前面缩进被并进文本）。
      if (rest.startsWith('<')) {
        stack.push('tag')
        afterOpenTag = false
        push('punct', '<')
        index += 1
        continue
      }
      if (rest.startsWith('{')) {
        const end = closingBraceIndex(rest)
        if (end === -1) fail('高亮器：JSX 表达式缺少配对的 }')
        push('punct', '{')
        tokens.push(...tokenizeJsx(rest.slice(1, end)))
        push('punct', '}')
        index += end + 1
        continue
      }
      const nextBoundary = rest.search(/[<{]/)
      const chunk = nextBoundary === -1 ? rest : rest.slice(0, nextBoundary)
      push('text', chunk)
      index += chunk.length
      continue
    }

    // js 模式
    // 空白也原样保留：这是给人看的示例代码，折叠缩进会把 `{ length: 20 }` 变成 `{length:20}`，
    // 渲染出来的代码就不再等于 markdown 里那一份。
    const space = eat(/^\s+/)
    if (space) {
      push('text', space[0])
      index += space[0].length
      continue
    }
    // 开标签之后紧跟的是文本子节点就切到 text 模式；否则清掉标记，避免把表达式里的
    // 第一个标识符误判成文本。空白与 `<` / `{` 都不算文本：前者后面通常还是结构（表达式、
    // 子标签），后者本身就是要着色的结构。中文文本不是 ASCII 标识符，靠这一条才能进 text。
    if (afterOpenTag) {
      if (!/^\s/.test(rest[0]) && !rest.startsWith('<') && !rest.startsWith('{')) {
        stack[stack.length - 1] = 'text'
        afterOpenTag = false
        continue
      }
      afterOpenTag = false
    }
    if (rest.startsWith('//')) {
      const line = /^[^\n]*/.exec(rest)[0]
      push('comment', line)
      index += line.length
      continue
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/')
      if (end === -1) fail('高亮器：块注释没有闭合')
      const chunk = rest.slice(0, end + 2)
      push('comment', chunk)
      index += chunk.length
      continue
    }
    if (rest.startsWith('`')) {
      let cursor = index + 1
      let chunk = '`'
      let closed = false
      while (cursor < code.length) {
        if (code[cursor] === '\\') {
          chunk += code.slice(cursor, cursor + 2)
          cursor += 2
          continue
        }
        if (code[cursor] === '`') {
          chunk += '`'
          cursor += 1
          closed = true
          break
        }
        if (code[cursor] === '$' && code[cursor + 1] === '{') {
          const inner = code.slice(cursor + 2)
          let end = 0
          let nest = 1
          while (end < inner.length) {
            if (inner[end] === '{') nest += 1
            if (inner[end] === '}') {
              nest -= 1
              if (nest === 0) break
            }
            end += 1
          }
          if (nest !== 0) fail('高亮器：模板字符串里的 ${ 没有闭合')
          chunk += '${'
          cursor += 2
          // 表达式与收尾字面量分别着色。
          push('string', chunk)
          tokens.push(...tokenizeJsx(code.slice(cursor, cursor + end)))
          index = cursor + end
          chunk = ''
          continue
        }
        chunk += code[cursor]
        cursor += 1
      }
      if (!closed) fail('高亮器：模板字符串没有闭合')
      push('string', chunk)
      index = cursor
      continue
    }
    const str = eat(/^'([^'\n]|\\.)*'|^"([^"\n]|\\.)*"/)
    if (str) {
      push('string', str[0])
      index += str[0].length
      atStart = false
      continue
    }
    const number = /^\d[\d_]*(\.\d+)?([eE][+-]?\d+)?/.exec(rest) ?? /^0x[\da-fA-F]+/.exec(rest)
    if (number) {
      push('number', number[0])
      index += number[0].length
      atStart = false
      continue
    }
    const ident = /^[A-Za-z_$][\w$]*/.exec(rest)
    if (ident) {
      const word = ident[0]
      const next = code[index + word.length]
      if (KEYWORDS.has(word)) push('keyword', word)
      else if (LITERALS.has(word)) push('literal', word)
      else if (BUILTINS.has(word)) push('builtin', word)
      else if (next === '(') push('fn', word)
      else if (prev?.value === '.' && (prev.type === 'punct' || prev.type === 'operator')) push('prop', word)
      else if (next === ':' && atStart) push('prop', word)
      else push('type', word)
      index += word.length
      atStart = false
      continue
    }
    const regexAllowed =
      prev === null ||
      prev.type === 'keyword' ||
      prev.type === 'operator' ||
      (prev.type === 'punct' && REGEX_PRECEDERS.has(prev.value))
    if (rest.startsWith('/') && regexAllowed) {
      const regex = /^\/[^/\n\\]*(?:\\.[^\/\n\\]*)*\/[a-z]*/.exec(rest)
      if (regex) {
        push('operator', regex[0])
        index += regex[0].length
        atStart = true
        continue
      }
    }
    if (rest.startsWith('<') && startsTag()) {
      stack.push('tag')
      afterOpenTag = false
      push('punct', '<')
      index += 1
      atStart = false
      continue
    }
    if (rest.startsWith('{')) {
      stack.push('js')
      push('punct', '{')
      atStart = true
      index += 1
      continue
    }
    if (rest.startsWith('}')) {
      stack.pop()
      push('punct', '}')
      atStart = true
      index += 1
      continue
    }
    const operator = rest.match(/^(=>|===|!==|==|!=|<=|>=|&&|\|\||\?\?|\.\.\.|--|\+\+|\+=|-=|\*=|\/=|[-+*/%^=!?&|.])/)
    if (operator) {
      push('operator', operator[0])
      index += operator[0].length
      atStart = false
      continue
    }
    const punct = eat(/^[^\sA-Za-z0-9_$`'"/<>{}[\]();,.?:&|?*^~]+/)
    if (punct) {
      push('punct', punct[0])
      index += punct[0].length
      atStart = punct[0].includes(';')
      continue
    }
    push('plain', rest[0])
    index += 1
    atStart = false
  }
  return tokens
}

function tokenizeCss(code) {
  const tokens = []
  let index = 0
  let inBlock = false
  const push = (type, value) => tokens.push({ type, value })
  while (index < code.length) {
    const rest = code.slice(index)
    const space = /^\s+/.exec(rest)
    if (space) {
      index += space[0].length
      continue
    }
    if (rest.startsWith('/*')) {
      const end = rest.indexOf('*/')
      if (end === -1) fail('高亮器：CSS 注释没有闭合')
      push('comment', rest.slice(0, end + 2))
      index += end + 2
      continue
    }
    if (rest.startsWith('@')) {
      const rule = /^@[\w-]+/.exec(rest)[0]
      push('at', rule)
      index += rule.length
      continue
    }
    const str = /^'[^']*'|^"[^"]*"/.exec(rest)
    if (str) {
      push('string', str[0])
      index += str[0].length
      continue
    }
    const number = /^-?\d+(\.\d+)?(px|em|rem|%|fr|s|ms|vh|vw|deg)?/.exec(rest)
    if (number) {
      push('number', number[0])
      index += number[0].length
      continue
    }
    if (rest.startsWith('{')) {
      inBlock = true
      push('punct', '{')
      index += 1
      continue
    }
    if (rest.startsWith('}')) {
      inBlock = false
      push('punct', '}')
      index += 1
      continue
    }
    if (rest.startsWith(':')) {
      push('punct', ':')
      index += 1
      continue
    }
    if (rest.startsWith(';')) {
      push('punct', ';')
      index += 1
      continue
    }
    const ident = /^[a-zA-Z_-][\w-]*/.exec(rest)
    if (ident) {
      const next = code[index + ident[0].length]
      const type = inBlock && next === ':' ? 'prop' : inBlock ? 'value' : 'selector'
      push(type, ident[0])
      index += ident[0].length
      continue
    }
    push('punct', rest[0])
    index += 1
  }
  return tokens
}

// HTML / Vue template：标签、属性、文本与 {{ }} 插值。
// 不做 Vue 指令的语义分析——`:attr`、`@event`、`v-for` 都按普通属性着色。
function tokenizeHtml(code) {
  const tokens = []
  const stack = ['html']
  let index = 0
  const push = (type, value) => tokens.push({ type, value })
  const mode = () => stack[stack.length - 1]
  while (index < code.length) {
    const rest = code.slice(index)
    if (mode() === 'html-tag') {
      const space = /^\s+/.exec(rest)
      if (space) {
        push('text', space[0])
        index += space[0].length
        continue
      }
      if (rest.startsWith('/>')) {
        push('punct', '/>')
        index += 2
        stack.pop()
        continue
      }
      if (rest.startsWith('>')) {
        push('punct', '>')
        index += 1
        stack.pop()
        continue
      }
      if (rest.startsWith('=')) {
        push('punct', '=')
        index += 1
        continue
      }
      const str = /^'[^']*'|^"[^"]*"/.exec(rest)
      if (str) {
        push('string', str[0])
        index += str[0].length
        continue
      }
      // 必须锚定在行首：不加 `^` 的备选分支会从句中某个 `{` 一直吃到串尾，把整段标签吞掉。
      const interpolation = /^\{[\s\S]*?\}/.exec(rest)
      if (interpolation) {
        push('punct', '{')
        tokens.push(...tokenizeJsx(interpolation[0].slice(1, -1)))
        push('punct', '}')
        index += interpolation[0].length
        continue
      }
      const attr = /^[:@#]?[A-Za-z_][\w:.-]*/.exec(rest)
      if (attr) {
        push('attr', attr[0])
        index += attr[0].length
        continue
      }
      push('punct', rest[0])
      index += 1
      continue
    }
    const space = /^\s+/.exec(rest)
    if (space) {
      push('text', space[0])
      index += space[0].length
      continue
    }
    if (rest.startsWith('<!--')) {
      const end = rest.indexOf('-->')
      if (end === -1) fail('高亮器：HTML 注释没有闭合')
      push('comment', rest.slice(0, end + 3))
      index += end + 3
      continue
    }
    if (rest.startsWith('{{')) {
      const end = rest.indexOf('}}')
      if (end === -1) fail('高亮器：插值 {{ 没有闭合')
      push('punct', '{{')
      tokens.push(...tokenizeJsx(rest.slice(2, end)))
      push('punct', '}}')
      index += end + 2
      continue
    }
    const closing = /^<\/\s*[A-Za-z][\w-]*/.exec(rest)
    if (closing) {
      const name = closing[0].replace(/^<\/\s*/, '')
      const after = rest.slice(closing[0].length)
      const end = after.indexOf('>')
      if (end === -1) fail('高亮器：HTML 闭合标签没有 >')
      push('punct', '</')
      push('tag', name)
      push('punct', after.slice(0, end + 1))
      index += closing[0].length + end + 1
      continue
    }
    const opening = /^<[A-Za-z][\w-]*/.exec(rest)
    if (opening) {
      push('punct', '<')
      push('tag', opening[0].slice(1))
      stack.push('html-tag')
      index += opening[0].length
      continue
    }
    const stop = rest.search(/[<{]/)
    const chunk = stop === -1 ? rest : rest.slice(0, stop)
    push('text', chunk)
    index += chunk.length
  }
  return tokens
}

// Vue SFC：按 <script> / <template> / <style> 三段分别着色，段间（通常是空行）按 HTML 处理。
function tokenizeVue(code) {
  const blocks = []
  for (const match of code.matchAll(/<(script|style|template)(\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
    blocks.push({
      start: match.index,
      end: match.index + match[0].length,
      open: match[0].slice(0, match[0].indexOf('>') + 1),
      inner: match[3],
      close: `</${match[1]}>`,
      tokenizer: match[1] === 'style' ? tokenizeCss : match[1] === 'script' ? tokenizeJsx : tokenizeHtml
    })
  }
  blocks.sort((a, b) => a.start - b.start)
  const tokens = []
  let cursor = 0
  for (const block of blocks) {
    if (block.start > cursor) tokens.push(...tokenizeHtml(code.slice(cursor, block.start)))
    tokens.push(...tokenizeHtml(block.open))
    tokens.push(...block.tokenizer(block.inner))
    tokens.push(...tokenizeHtml(block.close))
    cursor = block.end
  }
  if (cursor < code.length) tokens.push(...tokenizeHtml(code.slice(cursor)))
  return tokens
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(code, lang) {
  const tokens = lang === 'vue' ? tokenizeVue(code) : tokenizeJsx(code)
  let html = ''
  for (const token of tokens) {
    const escaped = escapeHtml(token.value)
    html += token.type === 'plain' ? escaped : `<span class="hl-${token.type}">${escaped}</span>`
  }
  // 自证：剥掉 token 标签并还原实体后必须逐字等于输入。着色器只要吞掉一个空白或字符，
  // 渲染出来的代码就不再等于 markdown 里的那一份——这是本文件最容易犯、也最难肉眼发现的错。
  const roundTrip = html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
  if (roundTrip !== code)
    fail(`高亮器改变了代码原文（${lang}）：\n--- 输入 ---\n${code}\n--- 脱去标签后 ---\n${roundTrip}`)
  return html
}

// ── 渲染 ─────────────────────────────────────────────────────────────────────

function renderModule(docs) {
  const payload = docs.map(doc => ({
    component: doc.component,
    tag: doc.tag,
    intro: doc.intro,
    samples: doc.examples.map(sample => ({
      title: sample.title,
      description: sample.description,
      html: { react: highlight(sample.react, 'react'), vue: highlight(sample.vue, 'vue') }
    })),
    api: [
      { key: 'props', title: 'Props', rows: doc.api.props },
      { key: 'events', title: 'Events', rows: doc.api.events },
      { key: 'slots', title: 'Slots', rows: doc.api.slots }
    ].filter(section => section.rows.length > 0)
  }))
  const json = JSON.stringify(payload, null, 2)
  return `// 本文件由 scripts/generate-web-ui-examples.mjs 生成，请勿手动编辑。
// source of truth：docs/examples/web-ui/*.md（示例与文案）+ packages/web-ui/src/components/*/index.ts（API 契约）。
// 重新生成：node scripts/generate-web-ui-examples.mjs

export interface ExampleApiRow {
  name: string
  type?: string
  default?: string
  description: string
}

export interface ExampleApiSection {
  key: 'props' | 'events' | 'slots'
  title: string
  rows: ExampleApiRow[]
}

export interface ExampleSample {
  title: string
  description: string
  html: { react: string; vue: string }
}

export interface ExampleDoc {
  component: string
  tag: string
  intro: string
  samples: ExampleSample[]
  api: ExampleApiSection[]
}

export const exampleDocs: ExampleDoc[] = ${json}
`
}

// 两个 demo 拿同一份 CSS：视觉一致不靠人肉同步，靠生成。
function renderCss() {
  return `/* 本文件由 scripts/generate-web-ui-examples.mjs 生成，请勿手动编辑。 */

/*
 * 只放代码高亮的 token 颜色。文档外框（间距、表格、<pre>）用 Tailwind 工具类写在两个 demo 的
 * example-doc 组件里，不在这里重复一份布局：那部分归仓级 Tailwind 主题管，搬进来反而会绕开
 * @theme 与 dark 变体。
 */

.hl-comment {
  font-style: italic;
  color: #7a8194;
}

.hl-string {
  color: #2f7d4f;
}

.hl-number {
  color: #a05cc7;
}

.hl-keyword {
  color: #c0455e;
}

.hl-literal {
  color: #a05cc7;
}

.hl-builtin {
  color: #2f6fb0;
}

.hl-operator {
  color: #8a5a2b;
}

.hl-tag {
  color: #c0455e;
}

.hl-attr {
  color: #2f6fb0;
}

.hl-type {
  color: #2f6fb0;
}

.hl-fn {
  color: #8a5a2b;
}

.hl-prop {
  color: #2f7d4f;
}

.hl-selector {
  color: #c0455e;
}

.hl-value {
  color: #2f6fb0;
}

.hl-at {
  color: #8a5a2b;
}

/* 深色档跟随 web-ui-theme 的 resolved-appearance（与 global.css 的 dark 变体同一口径），
   不用 prefers-color-scheme：用户可以在系统浅色下显式选深色。 */
web-ui-theme[resolved-appearance='dark'] .hl-string {
  color: #7fce9c;
}

web-ui-theme[resolved-appearance='dark'] .hl-keyword,
web-ui-theme[resolved-appearance='dark'] .hl-tag,
web-ui-theme[resolved-appearance='dark'] .hl-selector {
  color: #f08a9d;
}

web-ui-theme[resolved-appearance='dark'] .hl-attr,
web-ui-theme[resolved-appearance='dark'] .hl-type,
web-ui-theme[resolved-appearance='dark'] .hl-builtin,
web-ui-theme[resolved-appearance='dark'] .hl-value {
  color: #8ab8f5;
}
`
}

// ── 入口 ─────────────────────────────────────────────────────────────────────

function main() {
  const checkOnly = process.argv.includes('--check')
  // `--docs-dir` / `--out-dir` 是测试 seam：`scripts/generate-web-ui-examples.test.mjs` 用一份
  // 被篡改的 markdown 副本证明 join 是 fail-closed 的，而不去动仓库里的真实源文件。
  const flagValue = name => {
    const index = process.argv.indexOf(name)
    return index === -1 ? undefined : process.argv[index + 1]
  }
  const docsDir = flagValue('--docs-dir') ?? DOCS_DIR
  const outDirs = flagValue('--out-dir') ? [flagValue('--out-dir')] : OUTPUTS
  const files = readdirSync(docsDir)
    .filter(name => name.endsWith('.md'))
    .sort()
  if (files.length === 0) fail(`找不到 markdown 源文件：${docsDir}`)

  const docs = files.map(name => {
    const file = path.join(docsDir, name)
    const doc = parseMarkdown(file)
    // 文件名要等于 frontmatter 的 component：文件名同时是 demo 路由名，改名不同步会悄悄
    // 生成一条谁都渲染不到的数据（路由里 ExampleDoc 找的是路由名）。
    if (doc.component !== name.replace(/\.md$/, ''))
      fail(`${file}：frontmatter 的 component=${doc.component} 与文件名不一致，必须同名`)
    const contract = readComponentSource(doc.component)
    if (contract.tag !== doc.tag)
      fail(`${file}：frontmatter 声明 tag=${doc.tag}，但源码里是 @customElement('${contract.tag}')`)
    return {
      ...doc,
      api: {
        props: joinApi('props', contract.props, doc.api.props, file),
        events: joinApi('events', contract.events, doc.api.events, file),
        slots: joinApi('slots', contract.slots, doc.api.slots, file)
      }
    }
  })

  const module = renderModule(docs)
  const css = renderCss()
  for (const dir of outDirs) {
    const moduleFile = path.join(dir, 'web-ui-examples.ts')
    const cssFile = path.join(dir, 'web-ui-examples.css')
    if (checkOnly) {
      for (const [file, expected] of [
        [moduleFile, module],
        [cssFile, css]
      ]) {
        if (!existsSync(file))
          fail(`${file} 不存在：受版本控制的生成物缺失，跑 node scripts/generate-web-ui-examples.mjs 重新生成`)
        const actual = readFileSync(file, 'utf8')
        if (actual !== expected)
          fail(`${file} 与生成器输出不一致：改动源码或 markdown 后必须跑 node scripts/generate-web-ui-examples.mjs`)
      }
      continue
    }
    mkdirSync(dir, { recursive: true })
    writeFileSync(moduleFile, module)
    writeFileSync(cssFile, css)
  }

  const summary = docs
    .map(doc => {
      const counts = ['props', 'events', 'slots'].map(key => `${key}=${doc.api[key].length}`).join(' ')
      return `  ${doc.component} (${doc.tag}) 示例=${doc.examples.length} ${counts}`
    })
    .join('\n')
  console.log(`${checkOnly ? '[check] 生成物与输出一致' : '已生成'}：\n${summary}`)
}

main()
