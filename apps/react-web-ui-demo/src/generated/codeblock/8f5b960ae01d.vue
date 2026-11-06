<template>
  <div class="flex w-full max-w-md flex-col items-start gap-3">
    <web-ui-autocomplete
      ref="field"
      trigger="none"
      placeholder="none 模式"
      aria-label="none 模式"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="bug" label="缺陷"></web-ui-option>
      <web-ui-option value="feature" label="需求"></web-ui-option>
    </web-ui-autocomplete>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="field?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="field?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">最近一次 detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const field = useTemplateRef<WebUiAutocomplete>('field')
const last = ref('—')
</script>
