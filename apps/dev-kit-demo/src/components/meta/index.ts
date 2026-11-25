import { fenceGroupVariants, groupedMetaNodes, isHeadingLabel, tsJsFlavorOf } from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'
import { defineComponent, h, type PropType, type VNode } from 'vue'

import Codeblock from '../codeblock/index.vue'

const GROUP_OPTIONS = { flavorOf: tsJsFlavorOf, primaryFlavor: 'ts' } as const

function renderNodes(nodes: readonly MetaNode[], preview: boolean, docKey?: string, variantLabel?: string): VNode[] {
  return groupedMetaNodes(nodes, GROUP_OPTIONS).map(group =>
    group.length > 1
      ? h(Codeblock, { nodes: group, preview, docKey, variants: fenceGroupVariants(group), switchLabel: variantLabel })
      : renderNode(group[0]!, preview, docKey, variantLabel)
  )
}

function renderNode(node: MetaNode, preview: boolean, docKey?: string, variantLabel?: string): VNode {
  if (node.label === 'codeblock') return h(Codeblock, { nodes: [node], preview, docKey })
  if (node.label === 'img') return h('img', { src: node.src, alt: node.alt ?? '' })

  const properties: Record<string, unknown> = {}
  if (node.id) properties.id = node.id
  if (isHeadingLabel(node.label)) properties.class = 'mdm-heading'
  if (node.content) properties.innerHTML = node.content

  const children = node.children ? renderNodes(node.children, preview, docKey, variantLabel) : undefined
  if (node.label === 'table') return h('table', properties, [h('tbody', children)])
  return h(node.label, properties, children)
}

export const MetaComp = defineComponent({
  name: 'MetaComp',
  props: {
    nodes: { type: Array as PropType<readonly MetaNode[]>, required: true },
    preview: { type: Boolean, default: true },
    docKey: { type: String, default: undefined },
    variantLabel: { type: String, default: undefined }
  },
  setup(props) {
    return () => renderNodes(props.nodes, props.preview, props.docKey, props.variantLabel)
  }
})
