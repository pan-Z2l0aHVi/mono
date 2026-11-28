<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'

/*
 * 代码纯展示视图：字节/行数阈值判定与 shiki 异步着色由 previewSession 统一完成。
 * highlightedHtml 为 null 时按纯文本 <pre> 展示，绝不留白。
 * 过大提示条放在横向滚动容器外，内缩并带圆角，避免长行撑宽或紧贴 drawer 圆角边缘被裁切。
 */
defineProps<{
  code: string
  highlightedHtml: string | null
  overHighlightLimit: boolean
}>()
</script>

<template>
  <div class="min-h-full w-full">
    <div
      v-if="overHighlightLimit"
      role="status"
      class="mx-4 mt-4 flex items-center gap-2 rounded-xl border border-black/6 bg-[#1b1b20]/[0.035] px-3.5 py-2.5 text-xs leading-5 text-(--wui-color-text-secondary) dark:border-white/8 dark:bg-white/[0.06]"
    >
      <web-ui-icon :icon="lucideInfo" :size="15" class="shrink-0 text-(--wui-color-text-tertiary)" />
      <span class="min-w-0">文件过大，按纯文本显示开头部分，不着色。</span>
    </div>
    <div class="w-full overflow-x-auto">
      <div class="w-max min-w-full">
        <pre v-if="highlightedHtml === null" class="m-0 p-4 pt-3 font-mono text-xs leading-6 whitespace-pre">{{
          code
        }}</pre>
        <div v-else class="p-4 pt-3 font-mono text-xs leading-6" data-code v-html="highlightedHtml"></div>
      </div>
    </div>
  </div>
</template>
