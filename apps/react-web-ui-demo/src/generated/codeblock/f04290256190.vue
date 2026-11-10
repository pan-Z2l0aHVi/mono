<template>
  <web-ui-button @click="open = true">Open</web-ui-button>
  <web-ui-drawer
    closable
    :open="open"
    heading="Example"
    style="--wui-drawer-close-size: 34px"
    @open-change="open = $event.detail.open"
  >
    Example
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
