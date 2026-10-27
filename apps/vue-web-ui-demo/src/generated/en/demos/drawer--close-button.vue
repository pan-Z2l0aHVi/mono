<template>
  <div class="flex items-center gap-3">
    <web-ui-button @click="open = true">Open drawer</web-ui-button>
    <web-ui-checkbox :checked="closable" @change="closable = $event.target.checked">
      Show close button
    </web-ui-checkbox>
  </div>

  <web-ui-drawer :open="open" heading="Close button" :closable="closable" @open-change="open = $event.detail.open">
    <p>The close button is controlled by closable; after closing, you can check it again and reopen to compare.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const closable = ref(true)
</script>
