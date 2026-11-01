<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">Item disabled</span>
      <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
        <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid" disabled>Grid</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ view }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">Group disabled</span>
      <web-ui-segmented disabled :value="lockedView">
        <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="grid">Grid</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="board">Board</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ lockedView }} (not switchable)</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
const lockedView = ref('list')
</script>
