<template>
  <div ref="box" class="h-40 w-full overflow-auto rounded-xl border border-(--wui-color-border) p-3">
    <p v-for="row in rows" :key="row" class="m-0 py-1 text-sm">{{ row }}</p>
    <web-ui-back-top ref="backTop" :threshold="100">
      <web-ui-button variant="primary">Back to top</web-ui-button>
    </web-ui-back-top>
  </div>
</template>

<script setup lang="ts">
import type { WebUiBackTop } from '@greypan/web-ui'
import { onMounted, useTemplateRef } from 'vue'

const rows = Array.from({ length: 20 }, (_, index) => `Scroll container row ${index + 1}`)
const box = useTemplateRef<HTMLDivElement>('box')
const backTop = useTemplateRef<WebUiBackTop>('backTop')

onMounted(() => {
  if (box.value && backTop.value) backTop.value.scrollTarget = box.value
})
</script>
