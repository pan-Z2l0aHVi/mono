import { defineComponent, h, type PropType, type VNode } from 'vue'

import type { SafeMarkdownNode } from './previewSession'

/*
 * 单个已清洗 Markdown 节点的纯递归渲染：所有行内 HTML 清洗与图片协议白名单均已在
 * previewSession 解析阶段一次性完成，渲染期零 DOMParser 开销。
 */
export const MarkdownNodeView = defineComponent({
  name: 'MarkdownNodeView',
  props: {
    node: { type: Object as PropType<SafeMarkdownNode>, required: true }
  },
  setup(props) {
    const render = (node: SafeMarkdownNode): VNode => {
      switch (node.label) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return h(node.label, { id: node.id, class: 'mdm-heading', innerHTML: node.html })
        case 'p':
        case 'th':
        case 'td':
          return h(node.label, { innerHTML: node.html })
        case 'ul':
        case 'ol':
        case 'blockquote':
        case 'table':
        case 'tr':
          return h(
            node.label,
            node.children.map(child => h(MarkdownNodeView, { node: child }))
          )
        case 'li':
          return node.children
            ? h(
                'li',
                node.children.map(child => h(MarkdownNodeView, { node: child }))
              )
            : h('li', { innerHTML: node.html ?? '' })
        case 'hr':
          return h('hr')
        case 'img':
          return h('img', { src: node.src, alt: node.alt, loading: 'lazy', referrerpolicy: 'no-referrer' })
        case 'codeblock':
          return h('div', { class: 'mdm-code-host', innerHTML: node.html })
      }
    }
    return () => render(props.node)
  }
})
