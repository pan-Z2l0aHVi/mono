<template>
  <web-ui-button @click="open = true">Open</web-ui-button>
  <web-ui-dialog
    closable
    :open="open"
    heading="Example"
    style="--wui-dialog-close-size: 34px"
    @open-change="open = $event.detail.open"
  >
    Example
  </web-ui-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
