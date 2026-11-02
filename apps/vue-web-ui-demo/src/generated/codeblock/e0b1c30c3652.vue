<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="notify">创建完整 option 的 toast</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id：{{ id }} · 位置：bottom-right · 4 秒后自动关闭
    </output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const id = ref('—')

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

onBeforeUnmount(() => toast.clear())
</script>
