<template>
  <web-ui-button @click="open = true">打开受控 drawer</web-ui-button>

  <web-ui-drawer :open="open" controlled heading="受控关闭" @open-change="onOpenChange">
    <p>按 Escape、点遮罩或关闭按钮只会发出关闭请求。</p>
    <p v-if="rejected" class="text-(--wui-color-danger)">已拒绝关闭请求；请先确认。</p>
    <web-ui-button slot="footer" variant="secondary" full @click="close">确认关闭</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const rejected = ref(false)

function onOpenChange(event: CustomEvent<{ open: boolean }>) {
  if (event.detail.open) {
    rejected.value = false
    open.value = true
    return
  }
  // 不回写 open：drawer 会弹回打开位，消费方因此可以拒绝这次关闭。
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
