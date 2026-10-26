<template>
  <web-ui-button @click="open = true">Open headless drawer</web-ui-button>

  <web-ui-drawer
    :open="open"
    placement="left"
    headless
    draggable
    dialog-label="Custom panel"
    @open-change="open = $event.detail.open"
  >
    <div
      class="box-border h-full w-[min(320px,100vw)] rounded-r-2xl bg-(--wui-color-surface-overlay) p-6 text-(--wui-color-text)"
    >
      <h2 class="m-0 mb-2 text-xl">Custom panel</h2>
      <p class="m-0 text-(--wui-color-text-secondary)">
        headless provides only overlay behavior; the content, background, and radius are all decided here.
      </p>
    </div>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
