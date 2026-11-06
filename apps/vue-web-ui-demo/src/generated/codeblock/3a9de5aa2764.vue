<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-autocomplete
      ref="field"
      trigger="none"
      placeholder="none mode"
      aria-label="none mode"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="bug" label="Bug"></web-ui-option>
      <web-ui-option value="feature" label="Feature"></web-ui-option>
    </web-ui-autocomplete>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="field?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="field?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
const last = ref('—')
</script>
