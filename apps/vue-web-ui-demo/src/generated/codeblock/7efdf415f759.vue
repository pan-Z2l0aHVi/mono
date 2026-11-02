<template>
  <div class="flex flex-wrap items-end gap-6">
    <span v-for="size in sizes" :key="size" class="flex flex-col items-center gap-2">
      <web-ui-icon :icon="lucideStar" :size="size"></web-ui-icon>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ size }}</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideStar } from '@greypan/web-ui/icons'

const sizes = [14, 18, 24, 32]
</script>
