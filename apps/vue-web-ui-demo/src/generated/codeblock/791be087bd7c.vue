<template>
  <web-ui-button @click="open = true">Open edge-to-edge white drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    heading="Edge-to-edge white drawer"
    closable
    class="[--wui-drawer-bg:#fff] [--wui-drawer-radius:0] [--wui-drawer-inset:0] [--wui-color-text:#262626] [--wui-color-surface-control:#e5e5e5]"
    @open-change="open = $event.detail.open"
  >
    <p class="text-neutral-800">The background, radius, and viewport inset are all controlled by CSS variables.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
