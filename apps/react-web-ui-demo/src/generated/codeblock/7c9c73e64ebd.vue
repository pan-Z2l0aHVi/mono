<template>
  <div class="flex w-full max-w-md flex-col gap-4">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">text-overflow: ellipsis</div>
      <div class="truncate">{{ FILENAME }}</div>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">web-ui-middle-ellipsis</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
