import type { MetaNode } from '@greypan/md-to-meta'

import { flavorOf } from './flavor'

/** 标题节点由宿主挂 `mdm-heading`（类名契约在 `@greypan/md-to-meta`），分发按这个判据。 */
export function isHeadingLabel(label: MetaNode['label']): boolean {
  return /^h[1-6]$/.test(label)
}

/**
 * 一条示例的两份源码在文档里是相邻的 `tsx` 与 `vue` 围栏：命中配对的由宿主合成一张卡，
 * 由工具条切换显示哪一份。
 */
export function isFlavorPair(node: MetaNode, next: MetaNode | undefined): next is MetaNode {
  if (!next || node.label !== 'codeblock' || next.label !== 'codeblock') return false
  const left = flavorOf(node.lang)
  const right = flavorOf(next.lang)
  return left !== null && right !== null && left !== right
}

/** 把节点序列按「相邻 flavor 配对成一组，其余各自一组」切分；宿主对每组渲染一张卡。 */
export function groupedMetaNodes(nodes: readonly MetaNode[]): readonly MetaNode[][] {
  const groups: MetaNode[][] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const next = nodes[index + 1]
    if (isFlavorPair(node, next)) {
      groups.push([node, next])
      index += 1
      continue
    }
    groups.push([node])
  }
  return groups
}
