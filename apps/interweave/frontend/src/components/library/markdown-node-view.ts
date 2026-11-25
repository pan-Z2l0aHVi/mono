import { defineComponent, h, type PropType, type VNode } from 'vue'

import { allowedLinkTarget, sanitizeInlineHtml } from './markdown-html'
import type { PreviewMarkdownNode } from './previewRuntime'

/*
 * 单个 meta 节点的递归渲染。块级结构用 h() 精确拼装，行内 content 经 v-html 注入清洗结果。
 * 与 demo 的 meta 渲染器同构，但消费方是不可信的本地文件：没有 preview 槽、没有 exec thunk；
 * codeblock 的 content 是 highlightRuntime 的产物（代码文本逐字转义、结构由我们生成），直接注入。
 */
export const MarkdownNodeView = defineComponent({
  name: 'MarkdownNodeView',
  props: {
    node: { type: Object as PropType<PreviewMarkdownNode>, required: true }
  },
  setup(props) {
    const inline = (html: string | undefined) => sanitizeInlineHtml(html ?? '').html
    const render = (node: PreviewMarkdownNode): VNode | null => {
      switch (node.label) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return h(node.label, { id: node.id, class: 'mdm-heading', innerHTML: inline(node.content) })
        case 'p':
          return h('p', { innerHTML: inline(node.content) })
        case 'ul':
        case 'ol':
          return h(
            node.label,
            (node.children ?? []).map(child => h(MarkdownNodeView, { node: child }))
          )
        case 'li':
          return node.children
            ? h(
                'li',
                (node.children ?? []).map(child => h(MarkdownNodeView, { node: child }))
              )
            : h('li', { innerHTML: inline(node.content) })
        case 'blockquote':
          return h(
            'blockquote',
            (node.children ?? []).map(child => h(MarkdownNodeView, { node: child }))
          )
        case 'hr':
          return h('hr')
        case 'table':
          return h(
            'table',
            (node.children ?? []).map(child => h(MarkdownNodeView, { node: child }))
          )
        case 'tr':
          return h(
            'tr',
            (node.children ?? []).map(child => h(MarkdownNodeView, { node: child }))
          )
        case 'th':
        case 'td':
          return h(node.label, { innerHTML: inline(node.content) })
        case 'img': {
          const src = node.src ?? ''
          if (allowedLinkTarget(src) === null) return null
          return h('img', { src, alt: node.alt ?? '', loading: 'lazy', referrerpolicy: 'no-referrer' })
        }
        case 'codeblock':
          return h('div', { class: 'mdm-code-host', innerHTML: node.content ?? '' })
        default:
          return null
      }
    }
    return () => render(props.node)
  }
})
