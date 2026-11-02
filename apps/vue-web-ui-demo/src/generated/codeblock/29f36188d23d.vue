<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开 dialog</web-ui-button>
    <web-ui-dialog :open="open" no-backdrop-close heading="点击背景不会关闭" @open-change="open = $event.detail.open">
      <p class="m-0">点击卡片外的区域不会关闭。请使用下方 button 或 Escape 关闭。</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">关闭</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
