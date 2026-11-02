<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog :open="open" closable heading="Close button only" @open-change="open = $event.detail.open">
      <p class="m-0">This dialog has no footer. Close it with the top-right button, Escape, or the backdrop.</p>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
