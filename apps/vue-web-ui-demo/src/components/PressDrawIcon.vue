<script setup lang="ts">
import type { WebUiIcon, WebUiSvgDrawLines } from '@greypan/web-ui'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const lines = ref<WebUiSvgDrawLines | null>(null)
let trigger: Element | null = null
let animation: Animation | undefined
const reduced = () =>
  lines.value?.closest('web-ui-theme')?.getAttribute('motion') === 'reduced' ||
  window.matchMedia('(prefers-reduced-motion: reduce)').matches
function press() {
  animation?.cancel()
  if (lines.value && !reduced()) lines.value.style.transform = 'scale(.8)'
}
function cancel() {
  if (lines.value) lines.value.style.transform = ''
}
function release() {
  const el = lines.value
  if (!el) return
  const current = getComputedStyle(el).transform
  el.style.transform = ''
  if (!reduced()) {
    animation?.cancel()
    animation = el.animate(
      [{ transform: current }, { transform: 'scale(1.6)', offset: 0.4 }, { transform: 'scale(1)' }],
      { duration: 420, easing: 'cubic-bezier(.23,1,.32,1)' }
    )
  }
  queueMicrotask(async () => {
    await Promise.all([...el.querySelectorAll<WebUiIcon>('web-ui-icon')].map(icon => icon.updateComplete))
    if (el.isConnected) void el.replay()
  })
}
onMounted(() => {
  trigger = lines.value?.closest('button,web-ui-button') ?? null
  trigger?.addEventListener('pointerdown', press)
  trigger?.addEventListener('pointercancel', cancel)
  trigger?.addEventListener('click', release)
  window.addEventListener('pointerup', cancel)
})
onBeforeUnmount(() => {
  trigger?.removeEventListener('pointerdown', press)
  trigger?.removeEventListener('pointercancel', cancel)
  trigger?.removeEventListener('click', release)
  window.removeEventListener('pointerup', cancel)
  animation?.cancel()
})
</script>

<template>
  <web-ui-svg-draw-lines ref="lines" class="press-draw-icon" :duration="300" easing="ease-out" no-autoplay>
    <slot />
  </web-ui-svg-draw-lines>
</template>

<style scoped>
.press-draw-icon {
  display: inline-flex;
  transition: transform 140ms cubic-bezier(0.23, 1, 0.32, 1);
}

@media (prefers-reduced-motion: reduce) {
  .press-draw-icon {
    transition: none;
  }
}
</style>
