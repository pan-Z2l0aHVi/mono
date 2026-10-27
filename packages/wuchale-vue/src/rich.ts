import { ElementTypes, NodeTypes, type ElementNode, type TemplateChildNode } from '@vue/compiler-dom'
import type { Text } from 'wuchale'
import { compileTranslation } from 'wuchale/compiler'

const inline = new Set([
  'a',
  'abbr',
  'b',
  'br',
  'button',
  'em',
  'i',
  'img',
  'label',
  'mark',
  's',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u'
])
const builtins = new Set(['transition', 'transitiongroup', 'keepalive', 'teleport', 'suspense'])
const structural = new Set(['if', 'else', 'else-if', 'for', 'slot', 'html', 'text', 'pre'])

/** 原节点保留为 slot 工厂，译文仅持有文本、插值与节点编号。 */
export function richMessage(
  root: ElementNode,
  source: string,
  display: string,
  content: string,
  children: string,
  hasVPre: (node: ElementNode) => boolean
) {
  const hasInterpolation = (node: TemplateChildNode): boolean =>
    node.type === NodeTypes.INTERPOLATION || (node.type === NodeTypes.ELEMENT && node.children.some(hasInterpolation))
  const bindings = (node: TemplateChildNode): number =>
    node.type === NodeTypes.ELEMENT
      ? node.props.filter(prop => prop.type === NodeTypes.DIRECTIVE && prop.name !== 'on' && prop.exp).length +
        node.children.reduce((count, child) => count + bindings(child), 0)
      : 0
  const bindingCount = root.children.reduce((count, child) => count + bindings(child), 0)
  // Slot 工厂在译文顺序下执行；不提升与绑定交错的插值，也不改变多个绑定的相对求值顺序。
  if (bindingCount > 1 || (bindingCount > 0 && hasInterpolation(root))) return null
  function supported(node: TemplateChildNode): boolean {
    if (node.type === NodeTypes.TEXT) return !/\{\d+\}|<\/?\d+\/?>/.test(node.content)
    if (node.type === NodeTypes.INTERPOLATION) return node.content.type === NodeTypes.SIMPLE_EXPRESSION
    if (node.type !== NodeTypes.ELEMENT || node.ns !== 0) return false
    if (builtins.has(node.tag.replaceAll('-', '').toLowerCase())) return false
    if (node.props.some(prop => prop.type === NodeTypes.DIRECTIVE && structural.has(prop.name))) return false
    if (
      node !== root &&
      !(inline.has(node.tag) || (node.tagType === ElementTypes.COMPONENT && node.tag !== 'component'))
    )
      return false
    if (hasVPre(node)) return false
    // 组件可以不调用或多次调用默认 slot，不能提前求值其中的表达式。
    if (
      node.tagType === ElementTypes.COMPONENT &&
      node.children.some(child => hasInterpolation(child) || bindings(child) > 0)
    )
      return false
    return node.children.every(supported)
  }
  if (!supported(root)) return null
  const args: string[] = []
  const placeholders: Text['placeholders'] = []
  const slots: { id: number; node: ElementNode; original: string; path: string[] }[] = []
  let tag = 0
  const parents: number[] = []
  function walk(node: TemplateChildNode, parent = -1, path: string[] = []): string {
    if (node.type === NodeTypes.TEXT) return node.content
    if (node.type === NodeTypes.INTERPOLATION && node.content.type === NodeTypes.SIMPLE_EXPRESSION) {
      const id = args.length
      args.push(`${display}((${node.content.content}))`)
      placeholders.push([String(id), node.content.content])
      return `{${id}}`
    }
    if (node.type !== NodeTypes.ELEMENT) return ''
    const id = tag++
    parents[id] = parent
    path = [...path, node.tag]
    const body = node.children.map(child => walk(child, id, path)).join('')
    const start = node.loc.start.offset
    const end = node.loc.end.offset
    let original = source.slice(start, end)
    if (node.children.length) {
      original =
        source.slice(start, node.children[0].loc.start.offset) +
        `<${content} :nodes="${children}"/>` +
        source.slice(node.children[node.children.length - 1].loc.end.offset, end)
    }
    slots.push({ id, node, original, path })
    return body ? `<${id}>${body}</${id}>` : `<${id}/>`
  }
  const body = root.children.map(child => walk(child)).join('')
  return { body, fallback: compileTranslation(body.trim()), parents, args, placeholders, slots }
}

/** 消费核心已经编译的 composite；稳定 key 只保证同父节点内移动的实例身份。 */
export function richRuntime(rich: string, content: string, clone: string) {
  return `const ${content} = props => props.nodes
const ${rich} = {
  props: ['message', 'args', 'parents', 'fallback'],
  setup(props, { slots }) {
    const keys = new Map()
    const key = (id, original) => {
      let entry = keys.get(id)
      if (!entry || entry.original !== original) {
        entry = { original, value: Symbol() }
        keys.set(id, entry)
      }
      return entry.value
    }
    const render = parts => parts.flatMap(part => {
      if (typeof part === 'string') return part
      if (typeof part === 'number') return props.args[part]
      const [id, ...children] = part
      return slots['w' + id]({ children: render(children) }).map((node, i) =>
        ${clone}(node, { key: key(id + ':' + i, node.key) }))
    })
    let rejected
    return () => {
      const seen = new Set()
      const valid = (parts, parent = -1) => parts.every(part => {
        if (!Array.isArray(part)) return true
        const [id, ...children] = part
        if (seen.has(id) || props.parents[id] !== parent) return false
        seen.add(id)
        return valid(children, id)
      })
      if (valid(props.message) && seen.size === props.parents.length) return render(props.message)
      if (rejected !== props.message) {
        console.warn('[wuchale-vue] Unsupported rich-text translation hierarchy; preserving source structure.')
        rejected = props.message
      }
      return render(props.fallback)
    }
  }
}
`
}
