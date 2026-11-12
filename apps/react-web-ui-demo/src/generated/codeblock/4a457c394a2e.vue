<template>
  <web-ui-button @click="open = true">打开</web-ui-button>
  <web-ui-drawer
    closable
    :open="open"
    heading="示例"
    style="--wui-drawer-close-size: 34px"
    @open-change="open = $event.detail.open"
  >
    示例
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
</script>
