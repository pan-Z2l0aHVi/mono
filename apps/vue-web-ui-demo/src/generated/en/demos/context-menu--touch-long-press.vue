<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" long-press :long-press-delay="600" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        Press and hold for 600 ms in this area (touch)
      </div>
      <web-ui-dropdown-item>Rename</web-ui-dropdown-item>
      <web-ui-dropdown-item>Move</web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
