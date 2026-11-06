const NON_RENDERING_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE'])

/**
 * 默认结构判据：注释、纯空白文本、trigger slot、hidden 元素与不参与渲染的标签
 * 不构成内容；其余元素即使自身没有子节点也算内容。
 */
function isDefaultContentNode(node: Node): boolean {
  if (node instanceof Comment) return false
  if (node instanceof Text) return node.data.trim().length > 0
  if (!(node instanceof Element)) return false
  if (node.slot === 'trigger' || node.hasAttribute('hidden')) return false
  return !NON_RENDERING_TAGS.has(node.tagName)
}

/**
 * 判断内容根的直接子节点里是否有可展示内容。
 *
 * 只做结构判定，不计算样式或尺寸；组件的过滤态等差异经 `classify` 覆盖默认判定，
 * 返回 `undefined` 表示继续走默认规则。内容根由组件选择（关闭时的宿主、打开后的
 * portal 内容区），本函数不关心节点属于哪棵树。
 */
export function hasOverlayContent(root: Node, classify?: (node: Node) => boolean | undefined): boolean {
  for (const node of root.childNodes) {
    const verdict = classify?.(node)
    if (verdict ?? isDefaultContentNode(node)) return true
  }
  return false
}
