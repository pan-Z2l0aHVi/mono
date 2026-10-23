<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div v-for="position in POSITIONS" :key="position" class="w-48">
      <div class="mb-1 text-xs text-(--wui-color-text-secondary)">marker-position: {{ position }}</div>
      <web-ui-middle-ellipsis :text="FILENAME" :marker-position="position"></web-ui-middle-ellipsis>
    </div>
  </div>
</template>

<script setup lang="ts">
const FILENAME = 'very-long-file-name-abcdefghij.txt'
const POSITIONS = [0, 50, 80, 100]
</script>
