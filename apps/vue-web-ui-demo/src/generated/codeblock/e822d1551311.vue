<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      v-if="mounted"
      commit-on-unmount
      value="改几个字，再按下面的卸载按钮"
      aria-label="可卸载"
      @change="saveDraft"
    ></web-ui-editable-text>
    <span v-else class="text-sm text-(--wui-color-text-secondary)">这一行已经从 DOM 移除</span>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="mounted = false">卸载这一行</web-ui-button>
      <web-ui-button @click="mounted = true">重新挂载</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">卸载保住：{{ saved || '(还没有)' }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const mounted = ref(true)
const saved = ref('')

// 卸载由这次渲染驱动：change 到达时元素正在离开文档，先把值取出来再交给状态
function saveDraft(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  queueMicrotask(() => (saved.value = value))
}
</script>
