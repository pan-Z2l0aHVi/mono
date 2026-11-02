<template>
  <web-ui-button @click="open">Open preview (all controls)</web-ui-button>
</template>

<script setup lang="ts">
import { imagePreview } from '@greypan/web-ui'

const gradientImage = (label: string, from: string, to: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs><rect width="960" height="640" fill="url(#g)"/><text x="480" y="336" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">${label}</text></svg>`
  )}`

const IMAGES = [
  { src: gradientImage('First image', '#0a84ff', '#5e5ce6'), alt: 'Example image with a blue gradient' },
  { src: gradientImage('Second image', '#ff375f', '#ff9f0a'), alt: 'Example image with an orange-red gradient' },
  { src: gradientImage('Third image', '#30d158', '#0a84ff'), alt: 'Example image with a teal gradient' },
  { src: gradientImage('Fourth image', '#bf5af2', '#ff375f'), alt: 'Example image with a purple gradient' }
]

function open() {
  imagePreview({ images: IMAGES, nav: true, toolbar: true, closable: true, indicator: true })
}
</script>
