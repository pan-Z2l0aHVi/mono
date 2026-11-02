<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">Drag-close on the right</web-ui-button>
    <web-ui-button @click="bottomOpen = true">Drag-close at the bottom</web-ui-button>
  </div>

  <web-ui-drawer
    :open="rightOpen"
    draggable
    heading="Drag right to close"
    @open-change="rightOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the left edge and drag it more than half way to the right, or fling it, to close.</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="Drag down to close"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the top edge and drag it more than half way down, or fling it, to close.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
</script>
