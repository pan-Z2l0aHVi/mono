<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="notify">Create a toast with full options</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id: {{ id }} · position: bottom-right · closes automatically after 4 seconds
    </output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const id = ref('—')

function notify() {
  id.value = toast({
    heading: 'Saved',
    message: 'Changes written to the cloud',
    type: 'info',
    position: 'bottom-right',
    duration: 4000,
    closable: true
  })
}

onBeforeUnmount(() => toast.clear())
</script>
