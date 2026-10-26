<template>
  <web-ui-button @click="open = true">打开 headless drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    placement="left"
    headless
    draggable
    dialog-label="自定义面板"
    @open-change="open = $event.detail.open"
  >
    <div
      class="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)"
    >
      <h2 class="m-0 mb-2 text-xl">自定义面板</h2>
      <p class="m-0 text-(--wui-color-text-secondary)">headless 只提供 overlay 行为；内容、背景与圆角都由这里决定。</p>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
