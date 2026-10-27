<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-surface-control) text-sm text-(--wui-color-text)"
      >
        Right-click in this area
      </div>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>Copy
        <span slot="suffix" class="opacity-40">⌘C</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-item>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideClipboardPaste"></web-ui-icon>Paste
        <span slot="suffix" class="opacity-40">⌘V</span>
      </web-ui-dropdown-item>
      <web-ui-dropdown-divider></web-ui-dropdown-divider>
      <web-ui-dropdown-item disabled>
        <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>Delete
        <span slot="suffix" class="opacity-40">⌫</span>
      </web-ui-dropdown-item>
    </web-ui-context-menu>
    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { lucideClipboardPaste, lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
import { ref } from 'vue'

const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
