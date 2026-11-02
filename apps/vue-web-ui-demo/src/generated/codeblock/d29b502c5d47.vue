<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-theme ref="theme" appearance="system">
      <web-ui-button @click="inspect">Read and try to override</web-ui-button>
    </web-ui-theme>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ report }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const report = ref('Not read yet')

function inspect() {
  const el = theme.value
  if (!el) return
  const derived = el.resolvedAppearance
  const tampered = derived === 'dark' ? 'light' : 'dark'
  el.setAttribute('resolved-appearance', tampered)
  report.value = `Resolved ${derived}; after writing ${tampered} externally, read back ${el.getAttribute('resolved-appearance')}`
}
</script>
