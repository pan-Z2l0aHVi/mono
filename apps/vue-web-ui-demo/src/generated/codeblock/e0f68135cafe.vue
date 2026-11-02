<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">默认 …</div>
      <web-ui-middle-ellipsis :text="FILENAME"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为 [..]</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker="[..]"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker 为空串</div>
      <web-ui-middle-ellipsis :text="FILENAME" marker=""></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
</script>
