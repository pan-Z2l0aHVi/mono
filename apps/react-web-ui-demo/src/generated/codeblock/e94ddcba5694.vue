<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button class="[--wui-button-px:28px] [--wui-button-gap:14px]" variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
      内边距与插槽间距都放宽
    </web-ui-button>
    <web-ui-button :style="successOnly" variant="primary">只换底色</web-ui-button>
    <web-ui-button :style="fourStates" variant="secondary">四档配色</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideUpload } from '@greypan/web-ui/icons'
import type { CSSProperties } from 'vue'

const successOnly = { '--wui-button-bg': 'var(--wui-color-success)' } as CSSProperties

const fourStates = {
  '--wui-button-color': 'var(--wui-color-on-accent)',
  '--wui-button-bg': 'var(--wui-color-success)',
  '--wui-button-bg-hover': 'var(--wui-color-accent)',
  '--wui-button-bg-active': 'var(--wui-color-warning)'
} as CSSProperties
</script>
