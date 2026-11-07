import { fenceGroupVariants, groupedMetaNodes } from '@greypan/doc-demo-kit'
import type { MetaNode } from '@greypan/md-to-meta'
import { createElement } from 'react'

import Codeblock from '../codeblock'

interface MetaCompProps {
  nodes: readonly MetaNode[]
  /** 代码块是否渲染 `load` 来的运行示例；只读上下文（如 changelog）可以关掉。 */
  preview?: boolean
  variantLabel?: string
}

/**
 * 通用 meta 渲染：按 `label` 顺序渲染节点数组，宿主只负责「用哪个元素、挂什么类」。
 * 行内内容在生成期已是 HTML，原样写进 `content`；`children` 只承载结构嵌套。
 */
export function MetaComp({ nodes, preview = true, variantLabel }: MetaCompProps) {
  return (
    <>
      {groupedMetaNodes(nodes).map((group, index) => (
        <MetaNodeView key={index} nodes={group} preview={preview} variantLabel={variantLabel} />
      ))}
    </>
  )
}

function MetaNodeView({
  nodes,
  preview,
  variantLabel
}: {
  nodes: readonly MetaNode[]
  preview: boolean
  variantLabel?: string
}) {
  const node = nodes[0]
  if (!node) return null
  if (node.label === 'codeblock')
    return <Codeblock nodes={nodes} preview={preview} variants={fenceGroupVariants(nodes)} switchLabel={variantLabel} />
  if (node.label === 'img') return <img src={node.src} alt={node.alt ?? ''} />

  const properties: Record<string, unknown> = {}
  if (node.id) properties.id = node.id
  if (/^h[1-6]$/.test(node.label)) properties.className = 'mdm-heading'
  if (node.content) properties.dangerouslySetInnerHTML = { __html: node.content }

  const children =
    node.children &&
    groupedMetaNodes(node.children).map((group, index) => (
      <MetaNodeView key={index} nodes={group} preview={preview} variantLabel={variantLabel} />
    ))

  /*
   * html 的行本来就只允许出现在 `tbody` / `thead` 下，React 的开发期校验也会因为
   * `table > tr` 直接告警；meta 里表格只有一串 `tr`，宿主按元素语义补这一层。
   */
  if (node.label === 'table') return createElement('table', properties, createElement('tbody', null, children))

  return createElement(node.label, properties, children)
}
