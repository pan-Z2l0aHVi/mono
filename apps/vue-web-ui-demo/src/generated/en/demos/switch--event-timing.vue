<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-switch ref="field" @input="inputs = inputs + 1" @change="changes = changes + 1"></web-ui-switch>
    <web-ui-button @click="writeChecked">Write checked programmatically</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)"
      >input {{ inputs }} times · change {{ changes }} times</output
    >
  </div>
</template>

<script setup lang="ts">
import type { WebUiSwitch } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const inputs = ref(0)
const changes = ref(0)
const field = useTemplateRef<WebUiSwitch>('field')

function writeChecked() {
  const element = field.value
  if (element) element.checked = !element.checked
}
</script>
