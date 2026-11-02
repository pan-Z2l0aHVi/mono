<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">无空格长串</div>
      <web-ui-middle-ellipsis :text="NO_SPACE"></web-ui-middle-ellipsis>
    </div>
    <div class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">ZWJ 与变体选择符</div>
      <web-ui-middle-ellipsis :text="CLUSTERS"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const NO_SPACE = 'a'.repeat(120)
const CLUSTERS = `${'\u{1F469}\u200D\u{1F4BB}'.repeat(16)}${'\u{26A0}\uFE0F}'.repeat(8)}`
</script>
