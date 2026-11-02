<template>
  <web-ui-empty class="[--wui-empty-icon-size:51px]">
    <web-ui-icon slot="icon" :icon="lucideSearch" :size="51"></web-ui-icon>
    <strong>No matching entries</strong>
    <span slot="description">Try a shorter keyword, or switch to another filter.</span>
    <div slot="action" class="flex items-center justify-center gap-3">
      <web-ui-button variant="secondary">Clear filters</web-ui-button>
      <web-ui-button variant="primary">Back to list</web-ui-button>
    </div>
  </web-ui-empty>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
