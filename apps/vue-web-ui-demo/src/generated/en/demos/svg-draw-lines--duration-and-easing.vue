<template>
  <div class="flex flex-wrap items-end gap-x-8 gap-y-6 pb-4">
    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="fast" :duration="400">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="fast?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="slow" :duration="1600" easing="ease-out">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="slow?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
    </div>

    <div class="flex flex-col items-center gap-2">
      <web-ui-svg-draw-lines ref="bounce" :duration="1600" easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
        <svg
          viewBox="0 0 100 40"
          width="100"
          height="40"
          overflow="visible"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M5 30 Q25 0 50 30 T95 30"></path>
        </svg>
      </web-ui-svg-draw-lines>
      <web-ui-button variant="secondary" @click="bounce?.replay()">Replay</web-ui-button>
      <span class="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const fast = useTemplateRef<WebUiSvgDrawLines>('fast')
const slow = useTemplateRef<WebUiSvgDrawLines>('slow')
const bounce = useTemplateRef<WebUiSvgDrawLines>('bounce')
</script>
