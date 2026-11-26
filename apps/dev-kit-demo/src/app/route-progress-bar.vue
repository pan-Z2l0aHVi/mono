<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onScopeDispose, shallowRef } from 'vue'

import { routeProgress } from '@/router/progress'

// 直接订阅外部 store：进度状态不进 pinia，也不引入额外状态库。
const snapshot = shallowRef(routeProgress.getSnapshot())
const stopProgress = routeProgress.subscribe(() => {
  snapshot.value = routeProgress.getSnapshot()
})
// 失败反馈走 toast：顶部条在失败时立即收起，避免残留误导。
const stopFailure = routeProgress.onFailure(() => {
  toast.error('页面加载失败，请重试')
})
onScopeDispose(() => {
  stopProgress()
  stopFailure()
})
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-(--wui-layer-loading,3000) transition-opacity duration-200 motion-reduce:transition-none"
    :class="snapshot.visible ? 'opacity-100' : 'opacity-0'"
    :data-visible="snapshot.visible"
    :data-phase="snapshot.phase"
    :style="{
      '--wui-progress-height': '3px',
      '--wui-progress-radius': '0',
      '--wui-duration-trigger': snapshot.value === 0 ? '0ms' : '200ms'
    }"
  >
    <web-ui-progress
      class="pointer-events-none motion-reduce:[--wui-duration-trigger:0ms]"
      :value="snapshot.value"
      :max="100"
      :aria-hidden="snapshot.visible ? undefined : 'true'"
      aria-label="页面加载进度"
    ></web-ui-progress>
  </div>
</template>
