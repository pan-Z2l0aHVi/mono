<template>
  <web-ui-button @click="open = true">打开（点遮罩不关闭）</web-ui-button>

  <web-ui-drawer :open="open" no-backdrop-close heading="点遮罩不关闭" @open-change="open = $event.detail.open">
    <p>点击遮罩不会关闭；用底部按钮或 Escape 退出。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="open = false">关闭</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
