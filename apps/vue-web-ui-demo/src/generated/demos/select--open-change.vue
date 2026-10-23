<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select placeholder="打开或关闭 panel" @open-change="onOpenChange">
      <web-ui-option value="a" label="选项 A"></web-ui-option>
      <web-ui-option value="b" label="选项 B"></web-ui-option>
    </web-ui-select>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change：{{ count }} 次 · 最后一次 detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiSelect, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
