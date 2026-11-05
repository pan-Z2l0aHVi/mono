<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      ref="picker"
      trigger="none"
      placeholder="none mode"
      aria-label="none mode"
      @open-change="last = $event.detail.open ? 'true' : 'false'"
    >
      <web-ui-option value="a" label="Option A"></web-ui-option>
      <web-ui-option value="b" label="Option B"></web-ui-option>
    </web-ui-select>
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button size="28" variant="secondary" @click="picker?.show()">show()</web-ui-button>
      <web-ui-button size="28" variant="secondary" @click="picker?.hide()">hide()</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">Last detail.open = {{ last }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSelect } from '@greypan/web-ui'
import { ref, useTemplateRef } from 'vue'

const picker = useTemplateRef<WebUiSelect>('picker')
const last = ref('—')
</script>
