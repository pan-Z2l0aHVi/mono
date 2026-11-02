<template>
  <div class="flex w-full flex-col items-start gap-3">
    <web-ui-context-menu class="w-full" :disabled="disabled" @open-change="onOpenChange">
      <div
        class="flex h-32 w-full items-center justify-center rounded-xl border border-dashed border-(--wui-color-border) bg-(--wui-color-state-layer-hover) text-sm text-(--wui-color-text)"
      >
        {{ disabled ? 'The menu is disabled: right-click does not open it' : 'Right-click in this area' }}
      </div>
      <web-ui-dropdown-item>Edit</web-ui-dropdown-item>
      <web-ui-dropdown-item>Copy</web-ui-dropdown-item>
    </web-ui-context-menu>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button variant="secondary" @click="disabled = !disabled">
        {{ disabled ? 'Enable menu' : 'Disable menu' }}
      </web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">
        disabled = {{ disabled }} · open-change: {{ count }} times · last detail.open = {{ last }}
      </output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiContextMenu, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const disabled = ref(false)
const count = ref(0)
const last = ref('—')

function onOpenChange(event: WebUiEvent<WebUiContextMenu, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
