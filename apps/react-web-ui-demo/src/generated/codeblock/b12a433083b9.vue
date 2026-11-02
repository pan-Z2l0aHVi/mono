<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ changes }} 次 · 最后一次 detail.open = {{ last }}
    </output>
    <web-ui-dialog :open="open" heading="确认操作" @open-change="onOpenChange">
      <p class="m-0">删除后无法恢复，确定继续吗？</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">取消</web-ui-button>
      <web-ui-button slot="footer" full variant="danger" @click="open = false">删除</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const changes = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  changes.value += 1
  last.value = event.detail.open ? 'true' : 'false'
  open.value = event.detail.open
}
</script>
