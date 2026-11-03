<template>
  <web-ui-button @click="open = true">Open (page shifts)</web-ui-button>

  <web-ui-drawer
    :open="open"
    page-shift
    heading="The page shifts for the drawer"
    @open-change="open = $event.detail.open"
  >
    <p>
      Opening shifts the background page by a distance and it returns when the drawer closes; dragging this panel leaves
      the page in place.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
