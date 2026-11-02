<template>
  <web-ui-button @click="open = true">Open (backdrop does not close)</web-ui-button>

  <web-ui-drawer
    :open="open"
    no-backdrop-close
    heading="Backdrop does not close"
    @open-change="open = $event.detail.open"
  >
    <p>Clicking the backdrop does not close it; exit with the footer button or Escape.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="open = false">Close</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
