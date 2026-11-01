<template>
  <web-ui-segmented aria-label="View mode" :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="grid" aria-label="Grid view">
      <web-ui-icon :icon="lucideLayoutGrid" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="list" aria-label="List view">
      <web-ui-icon :icon="lucideList" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="settings" aria-label="Settings view">
      <web-ui-icon :icon="lucideSettings" :size="16"></web-ui-icon>
    </web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const view = ref('grid')
</script>
