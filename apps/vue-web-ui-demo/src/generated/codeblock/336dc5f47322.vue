<template>
  <web-ui-select trigger="icon" aria-label="View mode" :value="view" @change="pick($event.currentTarget.value)">
    <web-ui-icon slot="trigger" :icon="ICONS[view]" :size="18"></web-ui-icon>
    <web-ui-option value="grid" label="Grid"></web-ui-option>
    <web-ui-option value="list" label="List"></web-ui-option>
    <web-ui-option value="settings" label="Settings"></web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideLayoutGrid, lucideList, lucideSettings } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const ICONS = { grid: lucideLayoutGrid, list: lucideList, settings: lucideSettings }
type ViewMode = keyof typeof ICONS

const view = ref<ViewMode>('grid')

function pick(value: string) {
  if (value in ICONS) view.value = value as ViewMode
}
</script>
