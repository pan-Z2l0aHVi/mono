<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-svg-draw-lines ref="lines" :duration="900" easing="ease-in-out">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M7.5 12.5 L10.5 15.5 L16.5 9"></path>
      </svg>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">Draw in</web-ui-button>
    <web-ui-button variant="secondary" @click="lines?.replay({ reverse: true })">reverse retracts</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
