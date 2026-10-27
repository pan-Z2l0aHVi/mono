<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text
      v-if="mounted"
      commit-on-unmount
      value="Change a few characters, then click the unmount button below"
      aria-label="Unmountable"
      @change="saveDraft"
    ></web-ui-editable-text>
    <span v-else class="text-sm text-(--wui-color-text-secondary)">This line has been removed from the DOM</span>
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-button @click="mounted = false">Unmount this line</web-ui-button>
      <web-ui-button @click="mounted = true">Mount again</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)"
        >Preserved on unmount: {{ saved || '(nothing yet)' }}</output
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEditableText, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const mounted = ref(true)
const saved = ref('')

// The unmount is driven by this render: when change arrives the element is leaving the document, so take the value out first and then hand it to state
function saveDraft(event: WebUiEvent<WebUiEditableText, 'change'>) {
  const value = event.currentTarget.value
  queueMicrotask(() => (saved.value = value))
}
</script>
