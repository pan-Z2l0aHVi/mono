import type { MetaNode } from '@greypan/md-to-meta'
import { defineComponent, h, type PropType, type VNode } from 'vue'

import { flavorOf } from '../codeblock/flavor'
import Codeblock from '../codeblock/index.vue'

/**
 * 通用 meta 渲染：按 `label` 顺序渲染节点数组，宿主只负责「用哪个元素、挂什么类」。
 * 行内内容在生成期已是 HTML，原样写进 `content`；`children` 只承载结构嵌套。
 *
 * 一条示例的两份源码在文档里是相邻的 `tsx` 与 `vue` 围栏，合成一张卡由工具条切换；
 * 其余围栏各自一张卡。
 */
function renderNodes(nodes: readonly MetaNode[], preview: boolean): VNode[] {
  const rendered: VNode[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const next = nodes[index + 1]
    if (isFlavorPair(node, next)) {
      rendered.push(h(Codeblock, { nodes: [node, next], preview }))
      index += 1
      continue
    }
    rendered.push(renderNode(node, preview))
  }
  return rendered
}

function isFlavorPair(node: MetaNode, next: MetaNode | undefined): next is MetaNode {
  if (!next || node.label !== 'codeblock' || next.label !== 'codeblock') return false
  const left = flavorOf(node.lang)
  const right = flavorOf(next.lang)
  return left !== null && right !== null && left !== right
}

function renderNode(node: MetaNode, preview: boolean): VNode {
  if (node.label === 'codeblock') return h(Codeblock, { nodes: [node], preview })
  if (node.label === 'img') return h('img', { src: node.src, alt: node.alt ?? '' })

  const properties: Record<string, unknown> = {}
  if (node.id) properties.id = node.id
  if (/^h[1-6]$/.test(node.label)) properties.class = 'mdm-heading'
  if (node.content) properties.innerHTML = node.content

  const children = node.children ? renderNodes(node.children, preview) : undefined

  /*
   * html 的行本来就只允许出现在 `tbody` / `thead` 下；meta 里表格只有一串 `tr`，
   * 宿主按元素语义补这一层。
   */
  if (node.label === 'table') return h('table', properties, [h('tbody', children)])

  return h(node.label, properties, children)
}

export const MetaComp = defineComponent({
  name: 'MetaComp',
  props: {
    // 语种控制器里的文档是 `readonly` 的：渲染只读，不该为了类型多拷贝一层。
    nodes: { type: Array as PropType<readonly MetaNode[]>, required: true },
    /** 代码块是否渲染 `load` 来的运行示例；只读上下文（如 changelog）可以关掉。 */
    preview: { type: Boolean, default: true }
  },
  setup(props) {
    return () => renderNodes(props.nodes, props.preview)
  }
})
