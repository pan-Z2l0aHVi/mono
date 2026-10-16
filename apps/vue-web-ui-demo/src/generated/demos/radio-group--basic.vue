<template>
  <web-ui-radio-group name="size" :value="size" @input="onInput">
    <web-ui-radio value="s">小</web-ui-radio>
    <web-ui-radio value="m">中</web-ui-radio>
    <web-ui-radio value="l">大</web-ui-radio>
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
