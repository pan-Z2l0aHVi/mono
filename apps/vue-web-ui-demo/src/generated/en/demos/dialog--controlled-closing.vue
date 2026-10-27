<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <web-ui-dialog :open="open" controlled closable heading="Unsaved changes" @open-change="onOpenChange">
      <p class="m-0">Escape and the backdrop only request closing; without write-back it stays open.</p>
      <output class="block text-sm text-(--wui-color-text-secondary)">Close requests blocked · {{ requests }}</output>
      <web-ui-button slot="footer" variant="secondary" @click="open = false">Discard changes</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const requests = ref(0)

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  if (!event.detail.open) requests.value += 1
}
</script>
