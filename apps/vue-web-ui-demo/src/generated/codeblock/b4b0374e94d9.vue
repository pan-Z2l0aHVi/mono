<template>
  <div class="flex flex-wrap items-center gap-6">
    <web-ui-svg-draw-lines ref="lines" :duration="1400" easing="ease-in-out">
      <svg
        viewBox="0 0 24 24"
        width="40"
        height="40"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M12 5 V19"></path>
        <path d="M5 12 H19"></path>
      </svg>
      <web-ui-icon :icon="lucideStar" :size="40"></web-ui-icon>
    </web-ui-svg-draw-lines>
    <web-ui-button variant="secondary" @click="lines?.replay()">重播</web-ui-button>
    <span class="text-xs text-(--wui-color-text-secondary)">左边是 light DOM，右边是 icon 的 shadow root</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { lucideStar } from '@greypan/web-ui/icons'
import { useTemplateRef } from 'vue'

const lines = useTemplateRef<WebUiSvgDrawLines>('lines')
</script>
