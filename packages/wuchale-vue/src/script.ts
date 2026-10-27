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
  replace: (
    body: string | string[],
    start: number,
    end: number,
    path: Scope[],
    args?: string[],
    plural?: { callee: string; count: string }
  ) => void,
  unsupported: (start: number, end: number) => void,
  templatePluralNames: Iterable<string> = []
) {
  const ast = babelParse(expression ? `(${source})` : source, {
    sourceType: 'module',
    plugins: typescript ? ['typescript'] : []
  })
  const shift = expression ? 1 : 0
  const pluralImports = new Set<string>()
  for (const statement of ast.program.body) {
    if (statement.type === 'ImportDeclaration' && /(?:^|\/)plural\.js$/.test(statement.source.value)) {
      for (const specifier of statement.specifiers) {
        if (specifier.type === 'ImportDefaultSpecifier') pluralImports.add(specifier.local.name)
      }
    }
  }
  const pluralNames = new Set([...pluralImports, ...templatePluralNames])
  // 遇到同名局部绑定时不冒充作用域解析器，整个文件内的该 helper 保守跳过。
  const binding = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(binding)
      return
    }
    if (!node(value)) return
    if (value.type === 'Identifier') pluralImports.delete(String(value.name))
    else Object.values(value).forEach(binding)
  }
  const shadowed = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(shadowed)
      return
    }
    if (!node(value) || value.type === 'ImportDeclaration') return
    if (
      [
        'VariableDeclarator',
        'FunctionDeclaration',
        'FunctionExpression',
        'ClassDeclaration',
        'ClassExpression'
      ].includes(value.type) &&
      node(value.id)
    ) {
      binding(value.id)
    }
    if (value.type === 'CatchClause') binding(value.param)
    if (Array.isArray(value.params)) binding(value.params)
    Object.values(value).forEach(shadowed)
  }
  shadowed(ast)
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
      if (name === 'plural' || pluralNames.has(name)) {
        if (!active) return
        const args = Array.isArray(value.arguments) ? value.arguments : []
        const choices = args[1]
        if (
          pluralImports.has(name) &&
          args.length === 2 &&
          node(args[0]) &&
          args[0].type !== 'SpreadElement' &&
          node(choices) &&
          choices.type === 'ArrayExpression' &&
          Array.isArray(choices.elements) &&
          choices.elements.length > 0 &&
          choices.elements.every(item => node(item) && item.type === 'StringLiteral')
        ) {
          replace(
            choices.elements.map(item => String((item as Node).value)),
            (value.start ?? 0) - shift,
            (value.end ?? 0) - shift,
            path,
            [],
            { callee: slice(value.callee), count: slice(args[0]) }
          )
        } else unsupported((value.start ?? 0) - shift, (value.end ?? 0) - shift)
        return
      }
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
      const expressions = Array.isArray(value.expressions) ? value.expressions : []
      const quasis = Array.isArray(value.quasis) ? value.quasis : []
      const cooked = quasis.map(quasi =>
        node(quasi) && quasi.value && typeof quasi.value === 'object' && 'cooked' in quasi.value
          ? quasi.value.cooked
          : null
      )
      if (cooked.some(part => typeof part !== 'string' || /\{\d+\}|<\/?\d+\/?>/.test(part))) {
        unsupported((value.start ?? 0) - shift, (value.end ?? 0) - shift)
        return
      }
      const body = cooked.map((part, i) => `${String(part)}${i < expressions.length ? `{${i}}` : ''}`).join('')
      // 单独的模板插值保留 JavaScript 的 ToString 语义，包括 Symbol 抛错和逐项转换时机。
      const args = expressions.map(expr => '`' + '${(' + slice(expr) + ')}' + '`')
      replace(body, (value.start ?? 0) - shift, (value.end ?? 0) - shift, path, args)
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
