import type { MetaNode } from '@greypan/md-to-meta'

import { flavorOf } from './flavor'
import type { CodeblockVariant } from './install'

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

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'bun', 'yarn'])

function packageManagerOf(node: MetaNode): string | undefined {
  return node.label === 'codeblock' && node.lang && PACKAGE_MANAGERS.has(node.lang) ? node.lang : undefined
}

/** 合并相邻且名称不重复的包管理器围栏，或 React / Vue 围栏。 */
export function groupedMetaNodes(nodes: readonly MetaNode[]): readonly MetaNode[][] {
  const groups: MetaNode[][] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const manager = packageManagerOf(node)
    if (manager) {
      const group = [node]
      const seen = new Set([manager])
      while (index + 1 < nodes.length) {
        const candidate = nodes[index + 1]!
        const next = packageManagerOf(candidate)
        if (!next || seen.has(next)) break
        group.push(candidate)
        seen.add(next)
        index += 1
      }
      groups.push(group)
    } else if (isFlavorPair(node, nodes[index + 1])) {
      groups.push([node, nodes[++index]!])
    } else {
      groups.push([node])
    }
  }
  return groups
}

/** 将包管理器围栏转换为代码块切换选项。 */
export function fenceGroupVariants(nodes: readonly MetaNode[]): CodeblockVariant[] | undefined {
  if (nodes.length < 2) return undefined
  const seen = new Set<string>()
  const variants: CodeblockVariant[] = []
  for (const node of nodes) {
    const name = packageManagerOf(node)
    if (!name || seen.has(name)) return undefined
    seen.add(name)
    variants.push({ value: name, label: name, node })
  }
  return variants
}
