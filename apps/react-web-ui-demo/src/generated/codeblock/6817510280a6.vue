<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开图片详情</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      headless dialog：{{ open ? '已打开' : '已关闭' }}
    </output>
    <web-ui-dialog :open="open" headless aria-dialog-label="图片详情" @open-change="open = $event.detail.open">
      <div class="flex flex-col gap-4">
        <div class="flex items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="m-0 text-base font-semibold">山间清晨</h2>
            <span class="text-xs text-(--wui-color-text-secondary)">3840 × 2160 · JPEG</span>
          </div>
          <web-ui-button variant="secondary" @click="open = false">关闭</web-ui-button>
        </div>
        <div
          class="flex h-32 items-center justify-center rounded-lg bg-(--wui-color-surface-glass) text-sm text-(--wui-color-text-secondary)"
        >
          预览区域由页面自绘
        </div>
        <web-ui-button variant="primary" @click="open = false">完成</web-ui-button>
      </div>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
