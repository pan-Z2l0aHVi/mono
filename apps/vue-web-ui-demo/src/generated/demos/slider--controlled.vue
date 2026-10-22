<template>
  <web-ui-slider aria-label="受控音量" :value="volume" :min="0" :max="100" @input="onInput"></web-ui-slider>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSlider } from '@greypan/web-ui'
import { ref } from 'vue'

const volume = ref(30)

function onInput(event: WebUiEvent<WebUiSlider, 'input'>) {
  volume.value = event.currentTarget.value
}
</script>
