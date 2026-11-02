<template>
  <div class="flex items-center gap-3">
    <web-ui-button @click="open = true">打开 drawer</web-ui-button>
    <web-ui-checkbox :checked="closable" @change="closable = $event.target.checked"> 显示关闭按钮 </web-ui-checkbox>
  </div>

  <web-ui-drawer :open="open" heading="关闭按钮" :closable="closable" @open-change="open = $event.detail.open">
    <p>关闭按钮由 closable 控制；关闭后可以重新勾选再打开对比。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const closable = ref(true)
</script>
