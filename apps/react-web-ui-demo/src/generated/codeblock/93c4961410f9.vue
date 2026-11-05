<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">打开对话框</web-ui-button>
    <web-ui-dialog :open="open" closable heading="只有关闭按钮" @open-change="open = $event.detail.open">
      <p class="m-0">没有页脚，可以用右上角的关闭按钮、Escape 或遮罩关闭。</p>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
