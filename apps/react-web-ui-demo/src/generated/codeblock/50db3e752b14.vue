<template>
  <web-ui-button @click="open = true">打开（不锁定滚动）</web-ui-button>

  <web-ui-drawer :open="open" no-scroll-lock heading="背景仍可滚动" @open-change="open = $event.detail.open">
    <p>打开后试着滚动背景页面：no-scroll-lock 不会改写页面滚动。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
