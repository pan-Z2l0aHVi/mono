<template>
  <web-ui-checkbox-group name="fruit" :value="picked" @input="onInput">
    <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
    <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
    <web-ui-checkbox value="cherry">Cherry</web-ui-checkbox>
  </web-ui-checkbox-group>
</template>

<script setup lang="ts">
import type { WebUiCheckboxGroup, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const picked = ref(['banana'])

function onInput(event: WebUiEvent<WebUiCheckboxGroup, 'input'>) {
  picked.value = event.currentTarget.value
}
</script>
