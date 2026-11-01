<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover trigger="hover" placement="top" @open-change="last = $event.detail.open ? 'true' : 'false'">
      <web-ui-button slot="trigger" variant="secondary">Hover me</web-ui-button>
      <div class="max-w-xs text-sm">
        A panel shown on hover; it stays open when the pointer moves into it and closes 100ms after leaving.
      </div>
    </web-ui-popover>
    <output class="text-sm text-(--wui-color-text-secondary)">last detail.open = {{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('—')
</script>
