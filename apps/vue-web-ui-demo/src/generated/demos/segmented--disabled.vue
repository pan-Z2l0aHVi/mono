<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">单项 disabled</span>
      <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
        <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid" disabled>网格</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ view }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">组级 disabled</span>
      <web-ui-segmented disabled :value="lockedView">
        <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid">网格</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">看板</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ lockedView }}（不可切换）</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
const lockedView = ref('list')
</script>
