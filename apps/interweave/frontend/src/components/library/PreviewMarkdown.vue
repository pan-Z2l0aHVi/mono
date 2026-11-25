<script setup lang="ts">
import { MarkdownNodeView } from './markdown-node-view'
import type { SafeMarkdownNode } from './previewSession'

/*
 * Markdown 纯展示视图：解析与一次性安全清洗由 previewSession 完成；
 * 本组件只负责渲染已清洗的 SafeMarkdownNode 并在捕获阶段拦截受控外链点击。
 */
const props = defineProps<{
  nodes: readonly SafeMarkdownNode[]
  openLink: (href: string) => void
}>()

function handleRootClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0) return
  const target = event.target instanceof Element ? event.target.closest('a[data-md-href]') : null
  if (!target) return
  const href = target.getAttribute('data-md-href') ?? ''
  if (!href) return
  event.preventDefault()
  props.openLink(href)
}
</script>

<template>
  <section class="mdm-markdown min-h-full" data-preview-markdown @click.capture="handleRootClick">
    <MarkdownNodeView v-for="(node, index) in nodes" :key="index" :node="node" />
  </section>
</template>
