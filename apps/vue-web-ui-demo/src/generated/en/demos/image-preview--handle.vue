<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button @click="open">Open and go to image 2</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ status }}</output>
  </div>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'
import { ref } from 'vue'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' }
]

const status = ref('Not opened yet')

function open() {
  const preview = imagePreview({ images: IMAGES, toolbar: true })
  // Switching images resets the zoom to 1x, so call goTo before zoomIn.
  preview.goTo(1)
  preview.zoomIn()
  status.value = `Image ${preview.index + 1} · zoom ${Math.round(preview.scale * 100)}%`
  void preview.closed.then(() => {
    status.value = 'Preview closed'
  })
}
</script>
