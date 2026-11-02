<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="customHeader = true">自定义 header</web-ui-button>
    <web-ui-button @click="noHeader = true">不渲染 header</web-ui-button>
  </div>

  <web-ui-drawer :open="customHeader" closable @open-change="customHeader = $event.detail.open">
    <div slot="header" class="flex items-baseline gap-2 px-5 py-4">
      <strong class="text-lg">账户设置</strong>
      <span class="text-xs text-(--wui-color-text-secondary)">已保存</span>
    </div>
    <p>header 插槽的内容完全由消费方决定，关闭按钮仍由组件提供。</p>
  </web-ui-drawer>

  <web-ui-drawer :open="noHeader" @open-change="noHeader = $event.detail.open">
    <p>没有 heading，也没有 header 插槽，标题区不会占位。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const customHeader = ref(false)
const noHeader = ref(false)
</script>
