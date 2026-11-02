<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <web-ui-collapse :open="open" @open-change="open = $event.detail.open">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Show details
      </button>
      <div slot="content">
        <div class="p-3 text-sm">
          <p class="m-0">The content slot accepts any node: text, forms, images, even another collapse.</p>
        </div>
      </div>
    </web-ui-collapse>
    <output class="text-sm text-(--wui-color-text-secondary)">open after write-back: {{ open }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
