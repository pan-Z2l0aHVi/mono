<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-svg-draw-lines ref="lines" no-autoplay easing="ease-out">
      <web-ui-icon :icon="lucideCheck" :size="48"></web-ui-icon>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">replay()</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">挂载时静止在完整描边</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideCheck } from '@greypan/web-ui/icons'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
