<script setup lang="ts">
import { getRootScrollLeft, getRootScrollTop, getViewportSize, off, on } from '@greypan/browser-kit'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const viewport = ref(getViewportSize())
const scrollTop = ref(getRootScrollTop())
const scrollLeft = ref(getRootScrollLeft())

function updateMetrics() {
  viewport.value = getViewportSize()
  scrollTop.value = getRootScrollTop()
  scrollLeft.value = getRootScrollLeft()
}

onMounted(() => {
  on(window, 'resize', updateMetrics, { passive: true })
  on(window, 'scroll', updateMetrics, { passive: true })
  updateMetrics()
})

onBeforeUnmount(() => {
  off(window, 'resize', updateMetrics)
  off(window, 'scroll', updateMetrics)
})
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div class="rounded-md bg-muted/50 px-3 py-2">
        <div class="text-xs text-muted-foreground">视口宽度</div>
        <div class="font-mono font-semibold">{{ viewport.width }} px</div>
      </div>
      <div class="rounded-md bg-muted/50 px-3 py-2">
        <div class="text-xs text-muted-foreground">视口高度</div>
        <div class="font-mono font-semibold">{{ viewport.height }} px</div>
      </div>
      <div class="rounded-md bg-muted/50 px-3 py-2">
        <div class="text-xs text-muted-foreground">纵向滚动</div>
        <div class="font-mono font-semibold">{{ Math.round(scrollTop) }} px</div>
      </div>
      <div class="rounded-md bg-muted/50 px-3 py-2">
        <div class="text-xs text-muted-foreground">横向滚动</div>
        <div class="font-mono font-semibold">{{ Math.round(scrollLeft) }} px</div>
      </div>
    </div>
    <div>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="updateMetrics">手动刷新读数</button>
    </div>
  </div>
</template>
