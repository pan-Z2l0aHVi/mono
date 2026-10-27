// cspell:words txts
import { NodeTypes, type ElementNode, type SourceLocation, type TemplateChildNode } from '@vue/compiler-dom'
import { babelParse, MagicString, parse } from '@vue/compiler-sfc'
import { getKey, type HeuristicFunc, type Scope, type Text, type TransformCtx, type TransformOutput } from 'wuchale'

import { richMessage, richRuntime } from './rich'
import { visitStrings } from './script'

import type { VueDiagnostic } from './index'

const attributes = new Set(['title', 'alt', 'placeholder', 'aria-label', 'aria-description'])
const ignoredElements = new Set(['script', 'style', 'code', 'pre', 'textarea'])

type Edit = { start: number; end: number; replacement: string }

function textParts(content: string) {
  const body = content.trim()
  const start = content.indexOf(body)
  return { body, leading: content.slice(0, start), trailing: content.slice(start + body.length) }
}

function hasReservedIdentifier(value: unknown): boolean {
  if (value == null || typeof value !== 'object') return false
  if ('type' in value && value.type === 'Identifier' && 'name' in value && typeof value.name === 'string') {
    return value.name.startsWith('_w_')
  }
  return Object.values(value).some(hasReservedIdentifier)
}

function containsName(value: unknown, name: string): boolean {
  if (typeof value === 'string') return value.includes(name)
  if (value == null || typeof value !== 'object') return false
  return Object.values(value).some(child => containsName(child, name))
}

// Vue 的 parser 会从 props 中移除 v-pre；只扫描 AST 定位的 opening tag，并跳过属性值。
function hasVPre(node: ElementNode, source: string): boolean {
  let i = node.loc.start.offset + node.tag.length + 1
  while (i < node.loc.end.offset) {
    while (/\s/.test(source[i])) i++
    if (source[i] === '>' || source[i] === '/') return false
    const start = i
    while (i < node.loc.end.offset && !/[\s=/>]/.test(source[i])) i++
    const name = source.slice(start, i)
    if (name === 'v-pre' || name.startsWith('v-pre.') || name.startsWith('v-pre:')) return true
    while (/\s/.test(source[i])) i++
    if (source[i] !== '=') continue
    i++
    while (/\s/.test(source[i])) i++
    const quote = source[i]
    if (quote === '"' || quote === "'") {
      i++
      while (i < node.loc.end.offset && source[i] !== quote) i++
      i++
    } else {
      while (i < node.loc.end.offset && !/[\s>]/.test(source[i])) i++
    }
  }
  return false
}

export function transformVue(
  ctx: TransformCtx,
  heuristic: HeuristicFunc,
  onWarn: (diagnostic: VueDiagnostic) => void,
  componentAttributes: Record<string, string[]>
): TransformOutput {
  const { content, filename, index } = ctx
  const unchanged = (): TransformOutput => ({ txts: [], output: () => ({}) })
  const report = (code: VueDiagnostic['code'], message: string, loc?: SourceLocation) => {
    onWarn({
      code,
      message,
      filename,
      offset: loc?.start.offset ?? 0,
      line: loc?.start.line ?? 1,
      column: loc?.start.column ?? 1
    })
  }
  if (!filename.endsWith('.vue') || filename.includes('?')) return unchanged()
  const { descriptor, errors } = parse(content, { filename })
  if (errors.length) {
    for (const error of errors) {
      report(
        'parse-error',
        typeof error === 'string' ? error : error.message,
        typeof error !== 'string' && 'loc' in error ? error.loc : undefined
      )
    }
    return unchanged()
  }
  const { template, script, scriptSetup } = descriptor
  if (!template) return unchanged()
  if (
    script ||
    template.src ||
    (template.lang && template.lang !== 'html') ||
    scriptSetup?.src ||
    (scriptSetup?.lang && !['js', 'ts'].includes(scriptSetup.lang))
  ) {
    report('unsupported-sfc', '当前仅支持 inline HTML template 与 JS/TS script setup；保留整个 SFC。', template.loc)
    return unchanged()
  }
  const templatePluralNames = new Set<string>()
  if (scriptSetup) {
    try {
      const scriptAst = babelParse(scriptSetup.content, {
        sourceType: 'module',
        plugins: scriptSetup.lang === 'ts' ? ['typescript'] : []
      })
      for (const statement of scriptAst.program.body) {
        if (statement.type !== 'ImportDeclaration' || !/(?:^|\/)plural\.js$/.test(statement.source.value)) continue
        for (const specifier of statement.specifiers) {
          if (specifier.type === 'ImportDefaultSpecifier') templatePluralNames.add(specifier.local.name)
        }
      }
      if (hasReservedIdentifier(scriptAst)) {
        report('binding-collision', 'script 使用了 wuchale 保留的 _w_ identifier；保留整个 SFC。', scriptSetup.loc)
        return unchanged()
      }
    } catch (error) {
      report('parse-error', error instanceof Error ? error.message : String(error), scriptSetup.loc)
      return unchanged()
    }
  }
  if (!template.ast) {
    report('unsupported-sfc', 'template AST 不可用；保留整个 SFC。', template.loc)
    return unchanged()
  }
  // 模板 entity 和 JavaScript escape 会改变绑定名称，必须同时检查解码后的 AST。
  const uniqueName = (base: string) => {
    while (content.includes(base) || containsName(template.ast, base)) base += '_'
    return base
  }
  const runtime = uniqueName('_w_runtime_')
  const display = uniqueName('_w_display_')
  let usesDisplay = false
  let usesPlural = false
  let usesRich = false
  const rich = uniqueName('W_w_rich_')
  const richContent = uniqueName('W_w_content_')
  const richChildren = uniqueName('_w_children_')
  const composite = uniqueName('_w_message_')
  const clone = uniqueName('_w_clone_')
  const plural = uniqueName('_w_plural_')
  const locale = uniqueName('_w_locale_')
  const txts: Text[] = []
  const edits: Edit[] = []

  const literalAllowed = (body: string, loc: SourceLocation): boolean => {
    // wuchale 将这些字面量编译为占位符，而静态消息没有对应的 args。
    if (/\{\d+\}|<\/?\d+\/?>/u.test(body)) {
      report('unsupported-template', '静态文案包含 wuchale 保留的占位符语法；保留原文。', loc)
      return false
    }
    return true
  }
  const message = (
    body: string | string[],
    path: Scope[],
    loc: SourceLocation,
    placeholders: Text['placeholders'] = [],
    structured = false
  ): number | null => {
    if (
      !body.length ||
      (!structured &&
        !placeholders.length &&
        !(Array.isArray(body) ? body : [body]).every(part => literalAllowed(part, loc)))
    )
      return null
    const text: Text = { body, path, placeholders, type: 'message' }
    if (heuristic(text, filename) !== 'message') return null
    if (!index.has(getKey(body))) return null
    txts.push(text)
    return index.get(getKey(body))
  }

  const location = (start: number, end: number): SourceLocation => {
    const position = (offset: number) => {
      const lines = content.slice(0, offset).split('\n')
      return { offset, line: lines.length, column: lines[lines.length - 1].length + 1 }
    }
    return { start: position(start), end: position(end), source: content.slice(start, end) }
  }
  const strings = (source: string, offset: number, expression: boolean, parents: Scope[], destination = edits) => {
    const pending: Edit[] = []
    try {
      visitStrings(
        source,
        scriptSetup?.lang === 'ts',
        expression,
        (body, start, end, scopes, args = [], pluralCall) => {
          const loc = location(offset + start, offset + end)
          const id = message(
            body,
            [...parents, ...scopes],
            loc,
            args.map((arg, i) => [String(i), arg])
          )
          if (id != null) {
            if (pluralCall) usesPlural = true
            const replacement = pluralCall
              ? `${pluralCall.callee}(${pluralCall.count}, ${plural}(${id}), ${locale}())`
              : `${runtime}(${id}${args.length ? `, [${args.join(', ')}]` : ''})`
            pending.push({ start: loc.start.offset, end: loc.end.offset, replacement })
          }
        },
        (start, end) =>
          report(
            'unsupported-template',
            '无法静态解析的复数或 tagged template；整体保留原文。',
            location(offset + start, offset + end)
          ),
        expression ? templatePluralNames : []
      )
      destination.push(...pending)
    } catch (error) {
      report(
        'parse-error',
        error instanceof Error ? error.message : String(error),
        location(offset, offset + source.length)
      )
    }
  }
  if (scriptSetup) strings(scriptSetup.content, scriptSetup.loc.start.offset, false, [])

  const properties = (node: ElementNode, path: Scope[], destination = edits) => {
    for (const prop of node.props) {
      if (
        prop.type === NodeTypes.DIRECTIVE &&
        prop.name === 'bind' &&
        prop.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
        prop.arg.isStatic &&
        (attributes.has(prop.arg.content) || componentAttributes[node.tag]?.includes(prop.arg.content)) &&
        prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION
      ) {
        if (prop.exp.content === prop.exp.loc.source)
          strings(
            prop.exp.content,
            prop.exp.loc.start.offset,
            true,
            [...path, { type: 'attribute', name: prop.arg.content }],
            destination
          )
        else report('unsupported-template', '编码的绑定表达式保留原文。', prop.loc)
      }
      if (
        prop.type !== NodeTypes.ATTRIBUTE ||
        !(attributes.has(prop.name) || componentAttributes[node.tag]?.includes(prop.name)) ||
        !prop.value
      )
        continue
      const bound = node.props.some(
        sibling =>
          sibling.type === NodeTypes.DIRECTIVE &&
          sibling.name === 'bind' &&
          sibling.arg?.type === NodeTypes.SIMPLE_EXPRESSION &&
          sibling.arg.isStatic &&
          sibling.arg.content === prop.name
      )
      if (bound) {
        report('unsupported-template', '静态属性与同名 v-bind 共存；保留该属性。', prop.loc)
        continue
      }
      const { body, leading, trailing } = textParts(prop.value.content)
      const id = message(body, [...path, { type: 'attribute', name: prop.name }], prop.loc)
      if (id == null) continue
      const expression = [leading && JSON.stringify(leading), `${runtime}(${id})`, trailing && JSON.stringify(trailing)]
        .filter(Boolean)
        .join(' + ')
        .replaceAll('"', '&quot;')
      destination.push({
        start: prop.loc.start.offset,
        end: prop.loc.end.offset,
        replacement: `:${prop.name}="${expression}"`
      })
    }
  }

  const visit = (node: TemplateChildNode, parents: Scope[]) => {
    if (node.type !== NodeTypes.ELEMENT) return
    if (
      hasVPre(node, content) ||
      ignoredElements.has(node.tag) ||
      node.props.some(prop => prop.type === NodeTypes.DIRECTIVE && ['html', 'text'].includes(prop.name))
    ) {
      report('unsupported-template', '跳过 v-pre、原始内容或保留空白的元素。', node.loc)
      return
    }
    if (node.ns !== 0) {
      report('unsupported-template', '非 HTML 元素暂不转换。', node.loc)
      return
    }
    const nonEmpty = node.children.filter(child => child.type !== NodeTypes.TEXT || child.content.trim())
    const hasInterpolation = nonEmpty.some(child => child.type === NodeTypes.INTERPOLATION)
    const hasText = nonEmpty.some(child => child.type === NodeTypes.TEXT)
    const textOnly = node.children.every(
      child => child.type === NodeTypes.TEXT || child.type === NodeTypes.INTERPOLATION
    )
    const decorationOnly = node.children.every(
      child => child.type === NodeTypes.TEXT || (child.type === NodeTypes.ELEMENT && child.children.length === 0)
    )
    const mixed = (hasText || hasInterpolation) && !textOnly && !decorationOnly
    const path: Scope[] = [...parents, { type: 'element', name: node.tag }]
    if (mixed) {
      const sentence = richMessage(node, content, display, richContent, richChildren, child => hasVPre(child, content))
      if (!sentence) {
        report('unsupported-template', '富文本包含不支持的结构、指令或保留内容；保留整个元素。', node.loc)
        return
      }
      const parts = textParts(sentence.body)
      const id = message(parts.body, path, node.loc, sentence.placeholders, true)
      if (id == null) return
      usesRich = true
      usesDisplay ||= sentence.args.length > 0
      const attribute = (value: string) => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
      const args = attribute(`[${sentence.args.join(', ')}]`)
      const fallback = attribute(JSON.stringify(sentence.fallback))
      properties(node, path)
      const slots = sentence.slots
        .map(slot => {
          const local: Edit[] = []
          properties(slot.node, [...path, ...slot.path.map(name => ({ type: 'element' as const, name }))], local)
          const original = new MagicString(slot.original)
          for (const edit of local)
            original.overwrite(
              edit.start - slot.node.loc.start.offset,
              edit.end - slot.node.loc.start.offset,
              edit.replacement
            )
          return `<template #w${slot.id}="{ children: ${richChildren} }">${original.toString()}</template>`
        })
        .join('')
      edits.push({
        start: node.children[0].loc.start.offset,
        end: node.children[node.children.length - 1].loc.end.offset,
        replacement: `${parts.leading}<${rich} :message="${composite}(${id})" :args="${args}" :parents="${JSON.stringify(sentence.parents)}" :fallback="${fallback}">${slots}</${rich}>${parts.trailing}`
      })
      return
    }
    properties(node, path)
    if (hasInterpolation) {
      if (!hasText) {
        for (const child of node.children) {
          if (child.type === NodeTypes.INTERPOLATION && child.content.type === NodeTypes.SIMPLE_EXPRESSION) {
            if (child.content.content === child.content.loc.source)
              strings(child.content.content, child.content.loc.start.offset, true, path)
            else report('unsupported-template', '编码的插值表达式保留原文。', child.loc)
          }
        }
        return
      }
      const placeholders: Text['placeholders'] = []
      const args: string[] = []
      let body = ''
      for (const child of node.children) {
        if (child.type === NodeTypes.TEXT) {
          if (!literalAllowed(child.content, child.loc)) return
          body += child.content
        } else if (child.type === NodeTypes.INTERPOLATION && child.content.type === NodeTypes.SIMPLE_EXPRESSION) {
          const i = args.length
          placeholders.push([String(i), child.content.content])
          body += `{${i}}`
          args.push(`${display}((${child.content.loc.source}))`)
        } else {
          report('unsupported-template', '不支持的插值表达式；保留整句。', child.loc)
          return
        }
      }
      const parts = textParts(body)
      const id = message(parts.body, path, node.loc, placeholders)
      if (id == null) return
      usesDisplay = true
      edits.push({
        start: node.children[0].loc.start.offset,
        end: node.children[node.children.length - 1].loc.end.offset,
        replacement: `${parts.leading}{{ ${runtime}(${id}, [${args.join(', ')}]) }}${parts.trailing}`
      })
      return
    }
    for (const child of node.children) {
      if (child.type === NodeTypes.TEXT && child.content.trim()) {
        const { body, leading, trailing } = textParts(child.content)
        const id = message(body, path, child.loc)
        if (id == null) continue
        edits.push({
          start: child.loc.start.offset,
          end: child.loc.end.offset,
          replacement: `${leading}{{ ${runtime}(${id}) }}${trailing}`
        })
      } else {
        if (
          child.type === NodeTypes.INTERPOLATION &&
          child.content.type === NodeTypes.SIMPLE_EXPRESSION &&
          child.content.content === child.content.loc.source
        ) {
          strings(child.content.content, child.content.loc.start.offset, true, path)
        }
        visit(child, path)
      }
    }
  }
  for (const child of template.ast.children) {
    if (child.type === NodeTypes.TEXT && child.content.trim()) {
      report('unsupported-template', 'template 顶层文本暂不转换。', child.loc)
    } else visit(child, [])
  }
  if (!txts.length) return unchanged()
  return {
    txts,
    output(header) {
      const source = new MagicString(content)
      for (const edit of edits) source.overwrite(edit.start, edit.end, edit.replacement)
      const imports = [usesDisplay && `toDisplayString as ${display}`, usesRich && `cloneVNode as ${clone}`].filter(
        Boolean
      )
      const displayImport = imports.length ? `import { ${imports.join(', ')} } from 'vue'\n` : ''
      const params = scriptSetup?.lang === 'ts' ? 'id: number, args?: string[]' : 'id, args'
      // 每次 render 才读取 getter，保持 Vue tracking，并兼容核心的 HMR Runtime 包装器。
      const pluralInit = usesPlural
        ? `const ${plural} = (id${scriptSetup?.lang === 'ts' ? ': number' : ''}) => ${ctx.expr.reactive}.p(id)\nconst ${locale} = () => ${ctx.expr.reactive}.l\n`
        : ''
      const richInit = usesRich
        ? `const ${composite} = id => ${ctx.expr.reactive}.c(id)\n${richRuntime(rich, richContent, clone)}`
        : ''
      const init = `${header}\n${displayImport}const ${runtime} = (${params}) => ${ctx.expr.reactive}(id, args)\n${pluralInit}${richInit}`
      if (scriptSetup) source.appendLeft(scriptSetup.loc.start.offset, `\n${init}`)
      else source.prepend(`<script setup>\n${init}</script>\n`)
      return {
        code: source.toString(),
        map: source.generateMap({ source: filename, includeContent: true, hires: true })
      }
    }
  }
}
