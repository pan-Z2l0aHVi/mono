<route lang="json">
{
  "meta": {
    "title": "SVG 描边动画"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SvgDrawLinesDemo from '@/components/svg-draw-lines-demo/index.vue'
useHead({ title: () => 'SVG 描边动画' })
</script>

<template>
  <div class="p-3"><SvgDrawLinesDemo /></div>
</template>
