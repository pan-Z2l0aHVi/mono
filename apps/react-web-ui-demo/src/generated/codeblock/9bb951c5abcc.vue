<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="create">Create one</web-ui-button>
      <web-ui-button variant="secondary" @click="closeOne">Close this one</web-ui-button>
      <web-ui-button variant="secondary" @click="clearAll">Clear all</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last action: {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const DEMO_ID = 'demo-close'
const last = ref('—')

function create() {
  last.value = `Created ${toast.info('This toast does not close automatically', { id: DEMO_ID, duration: 0 })}`
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
