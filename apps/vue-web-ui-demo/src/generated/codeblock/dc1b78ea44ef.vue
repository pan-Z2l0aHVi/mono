<template>
  <web-ui-button @click="shakeCard">只震这张卡片</web-ui-button>
  <div ref="card" class="mt-3 w-64 rounded-xl border border-(--wui-color-border) bg-(--wui-color-surface) p-3 text-sm">
    没有填完的字段还在这块里。
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
