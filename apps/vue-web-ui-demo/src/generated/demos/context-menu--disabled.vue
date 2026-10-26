<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" :disabled="disabled" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        {{ disabled ? 'menu 已禁用：右键不打开' : '在此区域右键点击' }}
      </div>
      <web-ui-dropdown-item>编辑</web-ui-dropdown-item>
      <web-ui-dropdown-item>复制</web-ui-dropdown-item>
    </web-ui-context-menu>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="disabled = !disabled">
        {{ disabled ? '启用 menu' : '禁用 menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        disabled = {{ disabled }} · open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const disabled = ref(false)
const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
