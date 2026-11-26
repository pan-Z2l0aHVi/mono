import type { MetaNode } from '@greypan/md-to-meta'

import { flavorOf as defaultFlavorOf } from './flavor'
import type { CodeblockVariant } from './install'

/** 标题节点由宿主挂 `mdm-heading`（类名契约在 `@greypan/md-to-meta`），分发按这个判据。 */
export function isHeadingLabel(label: MetaNode['label']): boolean {
  return /^h[1-6]$/.test(label)
}

export interface FlavorPairOptions {
  readonly flavorOf?: (lang: string | undefined) => string | null
  /** 主 flavor（如 `'ts'`）；仅在主 flavor 在前带 `meta`、次 flavor 在后无 `meta` 时允许单边省写 `meta`。 */
  readonly primaryFlavor?: string
}

/**
 * 一条示例的两份源码在文档里是相邻的成对围栏（如 `tsx`/`vue` 或 `ts`/`js`）：
 * 命中配对的由宿主合成一张卡，由工具条切换显示哪一份。
 */
export function isFlavorPair(
  node: MetaNode,
  next: MetaNode | undefined,
  options?: FlavorPairOptions
): next is MetaNode {
  if (!next || node.label !== 'codeblock' || next.label !== 'codeblock') return false
  const resolveFlavor = options?.flavorOf ?? defaultFlavorOf
  const left = resolveFlavor(node.lang)
  const right = resolveFlavor(next.lang)
  if (left === null || right === null || left === right) return false

  const leftMeta = node.meta?.trim() || undefined
  const rightMeta = next.meta?.trim() || undefined
  if (leftMeta !== undefined && rightMeta !== undefined) return leftMeta === rightMeta
  if (leftMeta === undefined && rightMeta !== undefined) return false
  if (leftMeta !== undefined && rightMeta === undefined && options?.primaryFlavor !== undefined) {
    return left === options.primaryFlavor
  }
  return true
}

const PACKAGE_MANAGERS = new Set(['npm', 'pnpm', 'bun', 'yarn'])

function packageManagerOf(node: MetaNode): string | undefined {
  return node.label === 'codeblock' && node.lang && PACKAGE_MANAGERS.has(node.lang) ? node.lang : undefined
}

/** 合并相邻且名称不重复的包管理器围栏，或成对 flavor 围栏。返回签名保持 `readonly MetaNode[][]` 零破坏。 */
export function groupedMetaNodes(nodes: readonly MetaNode[], options?: FlavorPairOptions): readonly MetaNode[][] {
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
    } else if (isFlavorPair(node, nodes[index + 1], options)) {
      groups.push([node, nodes[++index]!])
    } else {
      groups.push([node])
    }
  }
  return groups
}

/** 从围栏 `meta` 字符串中解析 `demo=<id>` 标识；无匹配时返回 undefined。 */
export function parseDemoId(meta: string | undefined): string | undefined {
  if (!meta) return undefined
  const match = /(?:^|\s)demo=([^\s]+)/.exec(meta)
  return match?.[1] || undefined
}

export interface FenceGroupInfo {
  /** 围栏组级 meta（取组内首个非空 meta，与当前选中语言解耦）。 */
  readonly meta: string | undefined
  /** 从组级 meta 提取的稳定示例标识 `demo=<id>`。 */
  readonly demoId: string | undefined
  /** 该围栏组是否只包含单一 flavor（用于隐藏无意义的 segmented 切换条）。 */
  readonly singleFlavor: boolean
}

/** 提取围栏组级元数据与单/多 flavor 判据，供宿主在切换源码语言时不卸载交互面板。 */
export function fenceGroupInfo(
  nodes: readonly MetaNode[],
  resolveFlavor: (lang: string | undefined) => string | null = defaultFlavorOf
): FenceGroupInfo {
  let meta: string | undefined
  const flavors = new Set<string>()
  for (const node of nodes) {
    if (meta === undefined && node.meta?.trim()) meta = node.meta.trim()
    if (node.label === 'codeblock') {
      const flavor = resolveFlavor(node.lang)
      if (flavor !== null) flavors.add(flavor)
    }
  }
  return {
    meta,
    demoId: parseDemoId(meta),
    singleFlavor: flavors.size <= 1
  }
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
