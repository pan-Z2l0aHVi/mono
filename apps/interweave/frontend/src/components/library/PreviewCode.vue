<script setup lang="ts">
/*
 * 代码纯展示视图：字节/行数阈值判定与 shiki 异步着色由 previewSession 统一完成。
 * highlightedHtml 为 null 时按纯文本 <pre> 展示，绝不留白。
 */
defineProps<{
  code: string
  highlightedHtml: string | null
  overHighlightLimit: boolean
}>()
</script>

<template>
  <div class="min-h-full w-max min-w-full">
    <p
      v-if="overHighlightLimit"
      class="sticky left-0 m-0 border-b border-black/6 bg-(--wui-color-surface) px-4 py-2 text-xs text-(--wui-color-text-secondary) dark:border-white/8"
    >
      文件过大，按纯文本显示开头部分，不着色。
    </p>
    <pre v-if="highlightedHtml === null" class="m-0 p-4 pt-3 font-mono text-xs leading-6 whitespace-pre">{{
      code
    }}</pre>
    <div v-else class="p-4 pt-3 font-mono text-xs leading-6" data-code v-html="highlightedHtml"></div>
  </div>
</template>
