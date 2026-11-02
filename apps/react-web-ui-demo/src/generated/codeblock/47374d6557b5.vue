<template>
  <div class="flex w-full flex-col gap-3">
    <div class="w-1/3 max-w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">1/3 of the container width (max 192px)</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
    <div class="w-1/6 max-w-32">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">1/6 of the container width (max 128px)</div>
      <web-ui-middle-ellipsis :text="LONG_PATH"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const LONG_PATH = 'assets/images/screenshots/2026/06/very-long-file-name-abcdefghij.png'
</script>
