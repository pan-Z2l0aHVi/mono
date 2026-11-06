<template>
  <div class="flex flex-wrap gap-2">
    <web-ui-button v-for="position in POSITIONS" :key="position" variant="secondary" @click="notify(position)">
      {{ position }}
    </web-ui-button>
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

function notify(position: ToastPosition) {
  toast.info(position, { position })
}

onBeforeUnmount(() => toast.clear())
</script>
