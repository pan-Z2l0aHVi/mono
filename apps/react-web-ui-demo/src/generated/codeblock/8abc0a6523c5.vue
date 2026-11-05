<template>
  <web-ui-button @click="open = true">打开（页面偏移）</web-ui-button>

  <web-ui-drawer :open="open" page-shift heading="页面随 drawer 偏移" @open-change="open = $event.detail.open">
    <p>打开时背景整页偏移一段距离，关闭后回到原位；拖拽这块面板时页面停在原地。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
