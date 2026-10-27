<template>
  <div class="flex flex-col items-start gap-4">
    <div class="flex flex-wrap items-end gap-8">
      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="fast" :duration="400">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">400ms · linear (default)</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="slow" :duration="1600" easing="ease-out">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">1600ms · ease-out</span>
      </div>

      <div class="flex flex-col items-center gap-2">
        <web-ui-svg-draw-lines ref="bounce" :duration="1600" easing="cubic-bezier(0.68, -0.55, 0.27, 1.55)">
          <svg viewBox="0 0 100 40" width="100" height="40" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 30 Q25 0 50 30 T95 30"></path>
          </svg>
        </web-ui-svg-draw-lines>
        <span class="text-xs text-(--wui-color-text-secondary)">1600ms · curve that overshoots the endpoints</span>
      </div>
    </div>

    <web-ui-button variant="secondary" @click="replayAll">Replay all three</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiSvgDrawLines } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const fast = useTemplateRef<WebUiSvgDrawLines>('fast')
const slow = useTemplateRef<WebUiSvgDrawLines>('slow')
const bounce = useTemplateRef<WebUiSvgDrawLines>('bounce')

function replayAll() {
  void fast.value?.replay()
  void slow.value?.replay()
  void bounce.value?.replay()
}
</script>
