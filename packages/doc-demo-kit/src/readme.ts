import type { MetaNode } from '@greypan/md-to-meta'

/** 将 README 中相对文件链接指向其仓库位置。 */
export function resolveReadmeLinks(nodes: readonly MetaNode[], base: string): MetaNode[] {
  return nodes.map(node => ({
    ...node,
    ...(node.content ? { content: node.content.replaceAll('href="./', `href="${base}/`) } : {}),
    ...(node.children ? { children: resolveReadmeLinks(node.children, base) } : {})
  }))
}
