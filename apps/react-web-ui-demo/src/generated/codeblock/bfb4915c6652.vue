<template>
  <div class="flex w-full max-w-md flex-col gap-3">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="secondary" @click="panel?.show()">show()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.close()">close()</web-ui-button>
      <web-ui-button variant="secondary" @click="panel?.toggle()">toggle()</web-ui-button>
    </div>

    <web-ui-collapse ref="panel" @open-change="onOpenChange">
      <button
        type="button"
        class="w-full cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2 text-left"
      >
        Click the trigger to toggle
      </button>
      <div slot="content">
        <div class="p-3 text-sm">The three buttons above open and close the panel without incrementing the count.</div>
      </div>
    </web-ui-collapse>

    <output class="text-sm text-(--wui-color-text-secondary)">
      open-change: {{ count }} times · last detail.open = {{ last }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiCollapse, WebUiEvent } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const panel = useTemplateRef<WebUiCollapse>('panel')
const count = ref(0)
const last = ref('Nothing dispatched yet')

function onOpenChange(event: WebUiEvent<WebUiCollapse, 'open-change'>) {
  count.value += 1
  last.value = event.detail.open ? 'true' : 'false'
}
</script>
