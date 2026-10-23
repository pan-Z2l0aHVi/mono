<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="start">开始上传</web-ui-button>
      <web-ui-button @click="progress">进度 60%</web-ui-button>
      <web-ui-button @click="finish">完成</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">id：{{ UPLOAD_ID }} · 当前：{{ step }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const UPLOAD_ID = 'demo-upload'
const step = ref('尚未开始')

function start() {
  step.value = '0%'
  toast.info('上传中 0%', { id: UPLOAD_ID, duration: 0 })
}

function progress() {
  step.value = '60%'
  toast.info('上传中 60%', { id: UPLOAD_ID })
}

function finish() {
  step.value = '完成'
  toast.success('上传完成', { id: UPLOAD_ID, duration: 3000 })
}

onBeforeUnmount(() => toast.clear())
</script>
