import { babelParse } from '@vue/compiler-sfc'
import type { Scope } from 'wuchale'

interface Node {
  type: string
  start?: number | null
  end?: number | null
  [key: string]: unknown
}
function node(value: unknown): value is Node {
  return value != null && typeof value === 'object' && 'type' in value && typeof value.type === 'string'
}

/** 仅处理可重新执行的函数/模板表达式；跳过 setup 快照、协议比较、类型和宏参数。 */
export function visitStrings(
  source: string,
  typescript: boolean,
  expression: boolean,
  replace: (body: string, start: number, end: number, path: Scope[]) => void,
  unsupported: (start: number, end: number) => void
) {
  const ast = babelParse(expression ? `(${source})` : source, {
    sourceType: 'module',
    plugins: typescript ? ['typescript'] : []
  })
  const shift = expression ? 1 : 0
  const slice = (value: unknown) =>
    node(value) ? source.slice((value.start ?? 0) - shift, (value.end ?? 0) - shift) : ''
  const calleeName = (value: unknown): string => {
    if (!node(value)) return ''
    if (value.type === 'Identifier') return String(value.name)
    if (['TSAsExpression', 'TSNonNullExpression'].includes(value.type)) return calleeName(value.expression)
    if (['MemberExpression', 'OptionalMemberExpression'].includes(value.type)) {
      const property = node(value.property) ? value.property : undefined
      const key = property?.type === 'StringLiteral' ? String(property.value) : calleeName(property)
      return `${calleeName(value.object)}.${key}`
    }
    return ''
  }
  // 这些调用的字符串参数属于对象键或持久化协议，不是界面文案。
  const protocolCalls = new Set([
    'Object.hasOwn',
    'Object.defineProperty',
    'Object.getOwnPropertyDescriptor',
    'Reflect.get',
    'Reflect.set',
    'Reflect.has',
    'Reflect.deleteProperty',
    'Reflect.defineProperty',
    'Reflect.getOwnPropertyDescriptor'
  ])
  const visit = (value: unknown, path: Scope[], active: boolean) => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, path, active)
      return
    }
    if (!node(value)) return
    if (['TSAsExpression', 'TSSatisfiesExpression', 'TSNonNullExpression'].includes(value.type)) {
      visit(value.expression, path, active)
      return
    }
    if (
      value.type.startsWith('Import') ||
      value.type.startsWith('TS') ||
      ['NewExpression', 'BinaryExpression', 'ExportNamedDeclaration'].includes(value.type)
    )
      return
    if (value.type === 'TaggedTemplateExpression') {
      if (active) unsupported((value.start ?? 0) - shift, (value.end ?? 0) - shift)
      return
    }
    if (['CallExpression', 'OptionalCallExpression'].includes(value.type)) {
      const name = calleeName(value.callee) || slice(value.callee)
      if (
        /^(?:window\.|globalThis\.)?console\./.test(name) ||
        /^(?:window\.|globalThis\.)?(?:localStorage|sessionStorage)\./.test(name) ||
        protocolCalls.has(name) ||
        ['defineProps', 'defineEmits', 'defineOptions', 'defineExpose', 'defineModel', 'withDefaults'].includes(name)
      )
        return
      path = [...path, { type: 'call', kind: 'function', name }]
    }
    if (['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression', 'ObjectMethod'].includes(value.type)) {
      active = true
      path = [...path, { type: 'function', name: slice(value.id) || slice(value.key) }]
    }
    if (value.type === 'StringLiteral' && active && typeof value.value === 'string') {
      replace(value.value, (value.start ?? 0) - shift, (value.end ?? 0) - shift, path)
      return
    }
    if (value.type === 'TemplateLiteral' && active) {
      // 插值 template literal 尚未做求值/拼接语义转换，整体保留。
      if (Array.isArray(value.expressions) && value.expressions.length === 0 && Array.isArray(value.quasis)) {
        const quasi = value.quasis[0]
        if (
          node(quasi) &&
          quasi.value &&
          typeof quasi.value === 'object' &&
          'cooked' in quasi.value &&
          typeof quasi.value.cooked === 'string'
        ) {
          replace(quasi.value.cooked, (value.start ?? 0) - shift, (value.end ?? 0) - shift, path)
        }
      } else unsupported((value.start ?? 0) - shift, (value.end ?? 0) - shift)
      return
    }
    for (const [key, child] of Object.entries(value)) {
      if (
        ['key', 'id', 'params', 'callee', 'loc', 'extra', 'comments', 'leadingComments', 'trailingComments'].includes(
          key
        )
      )
        continue
      if (value.type === 'SwitchCase' && key === 'test') continue
      if (['MemberExpression', 'OptionalMemberExpression'].includes(value.type) && key === 'property') continue
      visit(child, path, active)
    }
  }
  visit(ast, [], expression)
}
