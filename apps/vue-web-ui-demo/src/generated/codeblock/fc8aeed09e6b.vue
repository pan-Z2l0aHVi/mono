<template>
  <div class="flex flex-wrap gap-2">
    <web-ui-button @click="showAllPositions">显示全部位置</web-ui-button>
    <web-ui-button variant="secondary" @click="toast.clear()">清空</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { toast, type ToastPosition } from '@greypan/web-ui'
import { onBeforeUnmount } from 'vue'

const POSITIONS: ToastPosition[] = [
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right'
]

function showAllPositions() {
  for (const position of POSITIONS) {
    toast.info(position, { id: `demo-position-${position}`, position, duration: 0 })
  }
}

onBeforeUnmount(() => toast.clear())
</script>
