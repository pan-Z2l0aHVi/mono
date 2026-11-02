<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog
      :open="open"
      no-backdrop-close
      heading="The backdrop will not close this"
      @open-change="open = $event.detail.open"
    >
      <p class="m-0">Clicking outside the card does nothing. Use the button below or Escape to close it.</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Close</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
