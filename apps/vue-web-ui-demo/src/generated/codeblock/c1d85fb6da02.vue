<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-popover ref="panel" trigger="none" :open="open" @open-change="open = $event.detail.open">
      <web-ui-button slot="trigger" variant="secondary">Manual toggle</web-ui-button>
      <div class="flex max-w-xs flex-col gap-1 text-sm">
        <span class="font-semibold">none mode</span>
        <span
          >Does not respond to gestures; clicking outside the panel or pressing Escape does not close it either.</span
        >
      </div>
    </web-ui-popover>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="panel?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">open = {{ open }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiPopover } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiPopover>('panel')
const open = ref(false)
</script>
