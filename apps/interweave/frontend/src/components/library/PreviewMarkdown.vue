<script setup lang="ts">
import { ref, watch } from 'vue'

import { allowedLinkTarget } from './markdown-html'
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
// 请求身份：快速切换资源时，旧文档的解析可能晚于新文档完成，没有 token 会把旧结果写进新预览。
let requestToken = 0

watch(
  () => props.markdown,
  markdown => {
    const request = ++requestToken
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
        if (request !== requestToken) return
        nodes.value = parsed.nodes
      })
      .catch(() => {
        if (request !== requestToken) return
        failed.value = true
      })
  },
  { immediate: true }
)

function handleRootClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return
  const target = event.target instanceof Element ? event.target.closest('a[data-md-href]') : null
  if (!target) return
  const href = target.getAttribute('data-md-href') ?? ''
  // 双重校验：清洗器已剥掉输入自带的同名属性，这里再验一次 scheme，防御纵深。
  if (allowedLinkTarget(href) === null) return
  event.preventDefault()
  void props.openExternal(href)
}
</script>

<template>
  <div v-if="failed" class="p-4 text-sm text-(--wui-color-text-secondary)">无法按文档渲染，请改用纯文本预览。</div>
  <section v-else class="mdm-markdown min-h-full" data-preview-markdown @click.capture="handleRootClick">
    <MarkdownNodeView v-for="(node, index) in nodes" :key="index" :node="node" />
  </section>
</template>
