<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip @open-change="last = $event.detail.open ? 'true' : 'false'">
        <web-ui-button icon variant="ghost" aria-label="查看快捷键">
          <web-ui-icon :icon="lucideInfo" :size="16"></web-ui-icon>
        </web-ui-button>
        <div slot="content" class="flex flex-col gap-1 text-sm">
          <span class="font-semibold">快捷键提示</span>
          <span>
            按 <kbd class="rounded border border-(--wui-color-border) px-1 font-mono text-xs">⌘K</kbd>
            打开命令面板
          </span>
        </div>
      </web-ui-tooltip>
      <span class="text-sm text-(--wui-color-text-secondary)">悬停或聚焦图标按钮</span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最后一次 detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { lucideInfo } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const last = ref('—')
</script>
