<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-tooltip
        content="Click to open, click again to close"
        trigger="click"
        @open-change="last = $event.detail.open ? 'true' : 'false'"
      >
        <web-ui-button variant="secondary">Click tooltip</web-ui-button>
      </web-ui-tooltip>
      <web-ui-tooltip content="Follows open only" trigger="manual" :open="open">
        <web-ui-button variant="secondary" @click="open = !open">Toggle open</web-ui-button>
      </web-ui-tooltip>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Click tooltip last detail.open = {{ last }} · writing open dispatches nothing
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const last = ref('-')
</script>
