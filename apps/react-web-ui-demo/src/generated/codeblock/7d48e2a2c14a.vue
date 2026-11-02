<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented :value="view" @input="onInput" @change="onChange">
      <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputCount }} / change: {{ changeCount }} · current: {{ view }}
    </output>
    <web-ui-button @click="view = 'month'">Set to “Month” externally</web-ui-button>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSegmented } from '@greypan/web-ui'
import { ref } from 'vue'

const view = ref('week')
const inputCount = ref(0)
const changeCount = ref(0)

function onInput(event: WebUiEvent<WebUiSegmented, 'input'>) {
  view.value = event.currentTarget.value
  inputCount.value += 1
}

function onChange(event: WebUiEvent<WebUiSegmented, 'change'>) {
  view.value = event.currentTarget.value
  changeCount.value += 1
}
</script>
