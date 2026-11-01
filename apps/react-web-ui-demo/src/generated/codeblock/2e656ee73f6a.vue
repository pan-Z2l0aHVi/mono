<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="showSuccess">success</web-ui-button>
      <web-ui-button @click="showInfo">info</web-ui-button>
      <web-ui-button @click="showWarning">warning</web-ui-button>
      <web-ui-button @click="showError">error</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">Last created id: {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const last = ref('—')

function showSuccess() {
  last.value = toast.success('Operation succeeded')
}

function showInfo() {
  last.value = toast.info('Informational message')
}

function showWarning() {
  last.value = toast.warning('Please note')
}

function showError() {
  last.value = toast.error('Something went wrong')
}

onBeforeUnmount(() => toast.clear())
</script>
