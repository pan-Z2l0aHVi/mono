<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover ref="panel" trigger="manual" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">手动开合</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">manual 模式</span>
        <span>不响应悬停；点击面板外或按 Escape 也不关闭。</span>
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="show">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="close">close()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)

function show() {
  panel.value?.show()
  open.value = true
}

function close() {
  panel.value?.close()
  open.value = false
}
</script>
