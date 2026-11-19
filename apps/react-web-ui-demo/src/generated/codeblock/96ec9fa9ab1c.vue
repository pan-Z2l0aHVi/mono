<template>
  <div class="flex flex-wrap gap-3">
    <web-ui-button @click="rightOpen = true">Drag-close on the right</web-ui-button>
    <web-ui-button @click="bottomOpen = true">Drag-close at the bottom</web-ui-button>
    <web-ui-button @click="fullOpen = true">Drag-to-full on the right</web-ui-button>
  </div>

  <web-ui-drawer
    :open="rightOpen"
    draggable
    heading="Drag right to close"
    @open-change="rightOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the left edge and drag it past the threshold to the right, or fling it, to close.</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="bottomOpen"
    placement="bottom"
    draggable
    heading="Drag down to close"
    @open-change="bottomOpen = $event.detail.open"
  >
    <p>Hold the gray pill on the top edge and drag it past the threshold downward, or fling it, to close.</p>
  </web-ui-drawer>

  <web-ui-drawer
    :open="fullOpen"
    draggable
    fullable
    heading="Drag right to go full"
    @open-change="fullOpen = $event.detail.open"
  >
    <p>
      Hold the gray pill on the left edge and drag it outward (to the left) past the travel threshold to snap full;
      pulling back past the restore threshold restores the original size and commits that gesture to leaving full.
      Release leaves it there; start another drag past the close threshold, or flick inward, to close.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const rightOpen = ref(false)
const bottomOpen = ref(false)
const fullOpen = ref(false)
</script>
