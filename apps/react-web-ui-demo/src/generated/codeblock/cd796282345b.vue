<template>
  <web-ui-button @click="open = true">Open controlled drawer</web-ui-button>

  <web-ui-drawer :open="open" controlled heading="Controlled closing" @open-change="onOpenChange">
    <p>Pressing Escape, clicking the backdrop, or using the close button only emits a close request.</p>
    <p v-if="rejected" class="text-(--wui-color-danger)">Close request rejected; confirm first.</p>
    <web-ui-button slot="footer" variant="secondary" full @click="close">Confirm close</web-ui-button>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
const rejected = ref(false)

function onOpenChange(event: CustomEvent<{ open: boolean }>) {
  if (event.detail.open) {
    rejected.value = false
    open.value = true
    return
  }
  // Not writing open back: the drawer springs back to the open position, so the consumer can reject this close.
  rejected.value = true
}

function close() {
  rejected.value = false
  open.value = false
}
</script>
