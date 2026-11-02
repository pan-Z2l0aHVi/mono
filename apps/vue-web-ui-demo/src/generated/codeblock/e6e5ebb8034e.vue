<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="start">Start upload</web-ui-button>
      <web-ui-button @click="progress">Progress 60%</web-ui-button>
      <web-ui-button @click="finish">Done</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">id: {{ UPLOAD_ID }} · current: {{ step }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const UPLOAD_ID = 'demo-upload'
const step = ref('Not started yet')

function start() {
  step.value = '0%'
  toast.info('Uploading 0%', { id: UPLOAD_ID, duration: 0 })
}

function progress() {
  step.value = '60%'
  toast.info('Uploading 60%', { id: UPLOAD_ID })
}

function finish() {
  step.value = 'Done'
  toast.success('Upload complete', { id: UPLOAD_ID, duration: 3000 })
}

onBeforeUnmount(() => toast.clear())
</script>
