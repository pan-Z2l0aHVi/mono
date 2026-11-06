<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="notify">创建完整 option 的 toast</web-ui-button>
      <web-ui-button variant="secondary" @click="notifyWithoutClose">创建不可关闭的 toast</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id：{{ id }} · 第一条 4 秒后自动关闭，第二条 6 秒后自动关闭
    </output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const id = ref('-')

function notify() {
  id.value = toast({
    heading: '已保存',
    message: '更改已写入云端',
    type: 'info',
    position: 'top-center',
    duration: 4000,
    closable: true
  })
}

function notifyWithoutClose() {
  id.value = toast({
    heading: '不可关闭',
    message: '这条没有关闭按钮',
    type: 'warning',
    position: 'bottom-right',
    duration: 6000,
    closable: false
  })
}

onBeforeUnmount(() => toast.clear())
</script>
