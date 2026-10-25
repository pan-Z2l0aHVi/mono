<template>
  <web-ui-button @click="open = true">打开贴边白色 drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    heading="贴边白色 drawer"
    closable
    class="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
    @open-change="open = $event.detail.open"
  >
    <p class="text-neutral-800">背景、圆角与视口留边都由 CSS 变量控制。</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
