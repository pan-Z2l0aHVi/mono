import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { fail } from './errors'

export interface SourceProp {
  attribute: string
  property: string
  type: string
  default: string
}

export interface SourceEvent {
  name: string
  type: string
}

export interface SourceSlot {
  name: string
}

export interface ComponentContract {
  file: string
  tag: string
  props: SourceProp[]
  events: SourceEvent[]
  slots: SourceSlot[]
}

const PROP_DECORATOR = /^\s*@property\(([\s\S]*?)\)/
const MODIFIERS = '(?:(?:public|private|protected|readonly|static|override|declare)\\s+)*'
const IDENTIFIER = '[A-Za-z_$][\\w$]*'

// Lit 装饰器里的 `type:` 是运行时序列化类型，不是 TS 类型；只在没有类型注解时当兜底。
const LIT_TYPE_TO_TS: Record<string, string> = {
  String: 'string',
  Number: 'number',
  Boolean: 'boolean',
  Array: 'unknown[]',
  Object: 'Record<string, unknown>'
}

interface DecoratorOptions {
  attribute?: string | false
  reflect?: boolean
  type?: string
  [key: string]: unknown
}

function escapeIdentifier(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// 选项在本仓恒为单行字面量；跨行时按括号配平续读，失败就报错而不是猜一个残缺对象。
function readDecoratorOptions(
  lines: string[],
  start: number
): { options: DecoratorOptions; end: number; trailing: string } {
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

  const options: DecoratorOptions = {}
  for (const match of text.matchAll(/(\w+):\s*('([^']*)'|true|false|null)/g)) {
    const key = match[1]
    const value = match[3] ?? (match[2] === 'true' ? true : match[2] === 'false' ? false : null)
    options[key] = value
  }
  const type = text.match(/type:\s*(\w+)/)
  if (type) options.type = type[1]
  return { options, end, trailing }
}

// 把 `typeof ALLOWED_TYPES[number]` 这类字面量 union 展开成源码里的字面量列表。
// 找不到常量定义就原样返回：类型列宁可显示源码形态，也不要显示一个猜出来的值。
function resolveTypeExpression(expression: string, literals: Map<string, string[]>): string {
  const text = expression.trim()
  const arrayIndex = /^\(?typeof\s+([A-Za-z_$][\w$]*)\)?\[number\]$/.exec(text)
  if (arrayIndex) {
    const values = literals.get(arrayIndex[1])
    if (values) return values.join(' | ')
    return text
  }
  const plain = /^typeof\s+([A-Za-z_$][\w$]*)$/.exec(text)
  const plainValues = plain ? literals.get(plain[1]) : undefined
  if (plainValues) return plainValues.join(' | ')
  return text
}

// 组件入口不一定是 index.ts：有的组件（如 toast）的 index.ts 只做 re-export，
// `@customElement` 落在目录里另一个 .ts。按 index.ts 优先、其余 .ts 兜底的顺序找声明它的文件。
export function resolveComponentFile(
  componentsDir: string,
  component: string
): { file: string; source: string; tag: string } {
  const dir = path.join(componentsDir, component)
  let names: string[]
  try {
    names = readdirSync(dir)
  } catch {
    return fail(`找不到组件源码 ${dir}——markdown 的 \`component\` 必须对应组件目录名`)
  }
  const candidates = names.filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts'))
  if (candidates.includes('index.ts')) candidates.splice(candidates.indexOf('index.ts'), 1)
  candidates.unshift('index.ts')
  for (const name of candidates) {
    if (!names.includes(name)) continue
    const file = path.join(dir, name)
    const source = readFileSync(file, 'utf8')
    const tag = /@customElement\('([^']+)'\)/.exec(source)?.[1]
    if (tag) return { file, source, tag }
  }
  return fail(`${dir}：没有任何 .ts 声明 @customElement 装饰器`)
}

// accessor 对可能 `set` 在前、`get` 在后（本仓两种顺序都有），类型跟着 getter 的返回注解；
// 只有 getter 时用 getter，否则退回 setter 的第一个形参类型。名字在整个 class 里检索，
// 不假设 getter 与 setter 紧挨着。
function findAccessorReturnType(lines: string[], property: string): string | undefined {
  const pattern = new RegExp(
    `^\\s*${MODIFIERS}get\\s+${escapeIdentifier(property)}\\s*\\([^)]*\\)\\s*:\\s*(.+?)\\s*\\{$`
  )
  for (const line of lines) {
    const match = pattern.exec(line)
    if (match) return match[1].trim()
  }
  return undefined
}

function findAccessorParamType(lines: string[], property: string): string | undefined {
  const pattern = new RegExp(
    `^\\s*${MODIFIERS}set\\s+${escapeIdentifier(property)}\\s*\\(\\s*${IDENTIFIER}\\s*\\??\\s*:\\s*([^)]+?)\\s*\\)`
  )
  for (const line of lines) {
    const match = pattern.exec(line)
    if (match) return match[1].trim()
  }
  return undefined
}

// accessor 的默认值是同名私有后备字段的初始值（`private _value = 0`、`@state() private _max = Infinity`）。
// 后备字段可能声明在 accessor 之前或之后，所以同样在整个 class 里按 `_<name>` 精确检索。
function findBackingDefault(lines: string[], property: string): string | undefined {
  const pattern = new RegExp(
    `^\\s*(?:@[\\w.]+(?:\\([^)]*\\))?\\s+)*${MODIFIERS}_${escapeIdentifier(property)}\\b\\s*(?::\\s*[^=]+?)?=\\s*(.+?)\\s*$`
  )
  for (const line of lines) {
    const match = pattern.exec(line)
    if (match) return match[1].trim()
  }
  return undefined
}

// `const X = <literal>` 与 `import { X } from './y'`：把默认值里的常量名还原成字面量，
// 免得 API 表里出现 `DEFAULT_MARKER` 这种只有源码读得懂的符号。只认字面量，认不出就保留原样。
function collectScalarConstants(file: string, seen = new Set<string>()): Map<string, string> {
  const constants = new Map<string, string>()
  if (seen.has(file)) return constants
  seen.add(file)
  let source: string
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
      if (imported && nested.has(imported)) constants.set(local ?? imported, nested.get(imported)!)
    }
  }
  return constants
}

export function readComponentSource(componentsDir: string, component: string): ComponentContract {
  const { file, source, tag } = resolveComponentFile(componentsDir, component)
  const lines = source.split('\n')

  // `const ALLOWED_X = [...] as const` —— 字面量 union 的唯一出处。
  const literals = new Map<string, string[]>()
  for (const line of lines) {
    const match = /^const\s+([A-Z][\w$]*)\s*=\s*\[(.*?)\]\s*as const/.exec(line)
    if (match)
      literals.set(
        match[1],
        match[2]
          .split(',')
          .map(value => value.trim().replace(/^['"]|['"]$/g, ''))
          .filter(Boolean)
      )
  }

  interface Entry extends SourceProp {
    /** 仅用于排序：SourceProp 的公共形状里没有它，收尾时删掉。可选是为了让 `delete` 合法。 */
    order?: number
  }
  const props: Entry[] = []
  const seen = new Set<string>()
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line.includes('@property(')) continue
    const match = PROP_DECORATOR.exec(line)
    if (!match) fail(`${file}：无法解析 @property 装饰器：${line.trim()}`)
    const { options, end, trailing } = readDecoratorOptions(lines, index)
    let next = end + 1
    while (next < lines.length && lines[next].trim() === '') next += 1
    const declaration = (trailing || lines[next] || '').trim()

    const accessorDeclaration = new RegExp(`^${MODIFIERS}(get|set)\\s+(${IDENTIFIER})\\s*\\(`).exec(declaration)
    // 字段声明：可选修饰符、可选 `?`、可选类型注解、可选初始值。缺初始值时默认值是 `—`（与源码一致）。
    const fieldDeclaration = new RegExp(
      `^${MODIFIERS}(${IDENTIFIER})\\s*(\\?)?\\s*(?::\\s*([^=]+?))?\\s*(?:=\\s*(.+?))?$`
    ).exec(declaration)

    let property: string
    let type: string
    let defaultValue: string
    if (accessorDeclaration) {
      property = accessorDeclaration[2]
      type = resolveTypeExpression(
        findAccessorReturnType(lines, property) ?? LIT_TYPE_TO_TS[options.type ?? ''] ?? 'unknown',
        literals
      )
      if (type === 'unknown')
        type = resolveTypeExpression(findAccessorParamType(lines, property) ?? 'unknown', literals)
      defaultValue = findBackingDefault(lines, property) ?? '—'
    } else if (fieldDeclaration) {
      property = fieldDeclaration[1]
      type = resolveTypeExpression(fieldDeclaration[3] ?? LIT_TYPE_TO_TS[options.type ?? ''] ?? 'unknown', literals)
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
    const getter = new RegExp(`^\\s{2}get\\s+(${IDENTIFIER})\\s*\\(`).exec(lines[index])
    if (!getter) continue
    const property = getter[1]
    if (property.startsWith('_')) continue
    if (props.some(entry => entry.property === property)) continue
    const setter = new RegExp(`^\\s{2}set\\s+${escapeIdentifier(property)}\\s*\\(`)
    if (!lines.some(line => setter.test(line))) continue
    if (seen.has(property)) continue
    seen.add(property)
    props.push({
      attribute: property,
      property,
      type: resolveTypeExpression(findAccessorReturnType(lines, property) ?? 'unknown', literals),
      default: findBackingDefault(lines, property) ?? '—',
      order: index
    })
  }

  // 收尾时按源码顺序排列，文档里 props 的次序与 class 里的声明一致。
  props.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  for (const entry of props) delete entry.order

  const scalarConstants = collectScalarConstants(file)
  for (const entry of props) {
    if (/^[A-Z][\w$]*$/.test(entry.default) && scalarConstants.has(entry.default))
      entry.default = scalarConstants.get(entry.default)!
    if (entry.type === 'unknown' && entry.default !== '—') {
      // 没有类型注解也没有 Lit `type:` 时，TS 会从字面量初始值推断；照同一规则补上，别写 unknown。
      if (entry.default === 'true' || entry.default === 'false') entry.type = 'boolean'
      else if (/^-?\d/.test(entry.default)) entry.type = 'number'
      else if (/^['"]/.test(entry.default)) entry.type = 'string'
    }
  }

  const events: SourceEvent[] = []
  const eventsBlock = /declare readonly \$events:\s*\{([\s\S]*?)\n {2}\}/.exec(source)
  if (eventsBlock) {
    // 事件名两种写法都有：带连字符的必须引号（`'open-change': ...`），标识符形态的不带（`input: Event`）。
    for (const line of eventsBlock[1].split('\n')) {
      const match = /^\s*'?([\w-]+)'?\s*:\s*(.+?)\s*$/.exec(line)
      if (match) events.push({ name: match[1], type: match[2] })
    }
  }

  const slots: SourceSlot[] = []
  // slot 标签的属性顺序与增删都会变（`<slot name="prefix" class=... @slotchange=...>`），
  // 只能按 `<slot` 起、`>` 止取整段再找 `name`，不能假设 name 紧贴标签名。
  for (const match of source.matchAll(/<slot\b([^>]*)>/g)) {
    const name = /\bname="([^"]+)"/.exec(match[1])?.[1] ?? 'default'
    if (!slots.some(slot => slot.name === name)) slots.push({ name })
  }

  return { file, tag, props, events, slots }
}
