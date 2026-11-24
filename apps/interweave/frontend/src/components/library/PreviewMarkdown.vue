<script setup lang="ts">
import { ref, watch } from 'vue'

import { MarkdownNodeView } from './markdown-node-view'
import { highlightForPreview, loadPreviewRuntime, type PreviewMarkdownNode } from './previewRuntime'

/*
 * Markdown 预览：md-to-meta runtime 解析成 meta 节点，按 demo 的结构渲染器同构地画出来，
 * 排版样式同源（.mdm-markdown，经 vite 的 mdmThemePlugin 落地）。
 *
 * 信任边界：所有行内 `content` 先过 sanitizeInlineHtml 白名单再注入；codeblock 的 `content`
 * 是 highlightRuntime 的产物（代码文本逐字转义、结构由我们生成），直接注入；
 * 链接改为 data-md-href，点击由根层捕获后交系统浏览器，绝不让 WebView 自己导航。
 */
const props = defineProps<{
  markdown: string
  openExternal: (target: string) => Promise<void>
}>()

const nodes = ref<PreviewMarkdownNode[]>([])
const failed = ref(false)

watch(
  () => props.markdown,
  markdown => {
    nodes.value = []
    failed.value = false
    loadPreviewRuntime()
      .then(runtime =>
        runtime.parseMarkdown(markdown, 'preview.md', {
          exec: [],
          highlight: (code, lang) => highlightForPreview(code, lang)
        })
      )
      .then(parsed => {
        nodes.value = parsed.nodes
      })
      .catch(() => {
        failed.value = true
      })
  },
  { immediate: true }
)

function handleRootClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return
  const target = event.target instanceof Element ? event.target.closest('a[data-md-href]') : null
  if (!target) return
  event.preventDefault()
  void props.openExternal(target.getAttribute('data-md-href') ?? '')
}
</script>

<template>
  <div v-if="failed" class="p-4 text-sm text-(--wui-color-text-secondary)">无法按文档渲染，请改用纯文本预览。</div>
  <section v-else class="mdm-markdown min-h-full" data-preview-markdown @click.capture="handleRootClick">
    <MarkdownNodeView v-for="(node, index) in nodes" :key="index" :node="node" />
  </section>
</template>
