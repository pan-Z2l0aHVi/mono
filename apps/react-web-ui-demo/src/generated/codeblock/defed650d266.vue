<template>
  <web-ui-button @click="shakeCard">Shake this card only</web-ui-button>
  <div ref="card" class="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm">
    Fields that still need attention live here.
  </div>
</template>

<script setup lang="ts">
import { shake } from '@greypan/web-ui'
import { useTemplateRef } from 'vue'

const card = useTemplateRef<HTMLDivElement>('card')

function shakeCard() {
  if (card.value) shake({ target: card.value, xDistance: 18 })
}
</script>
