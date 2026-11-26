<script setup lang="ts">
import { copyToClipboard } from '@greypan/browser-kit'
import { ref } from 'vue'

const text = ref('Hello from @greypan/browser-kit')
const status = ref<'idle' | 'done'>('idle')

async function handleCopy() {
  await copyToClipboard(text.value)
  status.value = 'done'
  window.setTimeout(() => {
    status.value = 'idle'
  }, 1500)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <input
      v-model="text"
      type="text"
      aria-label="待复制文本"
      class="min-w-60 flex-1 rounded-lg border border-(--wui-color-border) px-3 py-1.5 text-sm"
    />
    <web-ui-button variant="primary" @click="handleCopy">
      {{ status === 'done' ? '已复制到剪贴板' : '复制文本' }}
    </web-ui-button>
  </div>
</template>
