<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-theme ref="theme" appearance="system">
      <web-ui-button @click="inspect">读取并尝试改写</web-ui-button>
    </web-ui-theme>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ report }}</output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiTheme } from '@greypan/web-ui'
import { useTemplateRef, ref } from 'vue'

const theme = useTemplateRef<WebUiTheme>('theme')
const report = ref('还没读取')

function inspect() {
  const el = theme.value
  if (!el) return
  const derived = el.resolvedAppearance
  const tampered = derived === 'dark' ? 'light' : 'dark'
  el.setAttribute('resolved-appearance', tampered)
  report.value = `解析结果 ${derived}；外部写入 ${tampered} 之后回读到 ${el.getAttribute('resolved-appearance')}`
}
</script>
