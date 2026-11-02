<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button @click="open = true">Open dialog</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ changes }} times · last detail.open = {{ last }}
    </output>
    <web-ui-dialog :open="open" heading="Confirm action" @open-change="onOpenChange">
      <p class="m-0">This cannot be undone. Continue anyway?</p>
      <web-ui-button slot="footer" full variant="secondary" @click="open = false">Cancel</web-ui-button>
      <web-ui-button slot="footer" full variant="danger" @click="open = false">Delete</web-ui-button>
    </web-ui-dialog>
  </div>
</template>

<script setup lang="ts">
import type { WebUiDialog, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const open = ref(false)
const changes = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiDialog, 'open-change'>) {
  changes.value += 1
  last.value = event.detail.open ? 'true' : 'false'
  open.value = event.detail.open
}
</script>
