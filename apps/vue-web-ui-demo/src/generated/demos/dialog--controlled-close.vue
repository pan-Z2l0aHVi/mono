<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog :open="open" controlled closable heading="未保存的更改" @open-change="onOpenChange">
      <p class="m-0">Escape 与 backdrop 只请求关闭；页面不写回，dialog 保持打开。</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">已拦截关闭请求 · {{ requests }} 次</output>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">放弃更改</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const requests = ref(0)

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (!event.detail.open) requests.value += 1
}
</script>
