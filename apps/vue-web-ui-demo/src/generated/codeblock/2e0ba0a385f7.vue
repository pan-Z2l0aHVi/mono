<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="create">创建一条</web-ui-button>
      <web-ui-button variant="secondary" @click="closeOne">关闭这一条</web-ui-button>
      <web-ui-button variant="secondary" @click="clearAll">清空全部</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近操作：{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const DEMO_ID = 'demo-close'
const last = ref('—')

function create() {
  last.value = `创建 ${toast.info('这条 toast 不会自动关闭', { id: DEMO_ID, duration: 0 })}`
}

function closeOne() {
  toast.close(DEMO_ID)
  last.value = `toast.close(${DEMO_ID})`
}

function clearAll() {
  toast.clear()
  last.value = 'toast.clear()'
}

onBeforeUnmount(() => toast.clear())
</script>
