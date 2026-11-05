<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="notify">Create a toast with full options</web-ui-button>
      <web-ui-button variant="secondary" @click="notifyWithoutClose">
        Create a toast without a close button
      </web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      id: {{ id }} · the first closes after 4 seconds, the second after 6
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
    position: 'top-center',
    duration: 4000,
    closable: true
  })
}

function notifyWithoutClose() {
  id.value = toast({
    heading: 'Cannot close',
    message: 'This toast has no close button',
    type: 'warning',
    position: 'bottom-right',
    duration: 6000,
    closable: false
  })
}

onBeforeUnmount(() => toast.clear())
</script>
