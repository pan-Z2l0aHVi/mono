<template>
  <web-ui-radio-group name="size" :value="size" @input="onInput">
    <web-ui-radio value="s">Small</web-ui-radio>
    <web-ui-radio value="m">Medium</web-ui-radio>
    <web-ui-radio value="l">Large</web-ui-radio>
  </web-ui-radio-group>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiRadioGroup } from '@greypan/web-ui'
import { ref } from 'vue'

const size = ref('m')

function onInput(event: WebUiEvent<WebUiRadioGroup, 'input'>) {
  size.value = event.currentTarget.value
}
</script>
