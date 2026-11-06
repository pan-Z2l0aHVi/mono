<template>
  <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
    <span v-for="(icon, name) in iconGallery" :key="name" class="flex min-w-0 w-full flex-col items-center gap-2">
      <web-ui-icon :icon="icon"></web-ui-icon>
      <span class="w-full break-words text-center text-xs leading-tight text-(--wui-color-text-secondary)">
        {{ name }}
      </span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { iconGallery } from '@greypan/web-ui/icons'
</script>
