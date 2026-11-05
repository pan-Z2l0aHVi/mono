<template>
  <div class="flex flex-wrap gap-2">
    <web-ui-button @click="showAllPositions">Show every position</web-ui-button>
    <web-ui-button variant="secondary" @click="toast.clear()">Clear</web-ui-button>
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
