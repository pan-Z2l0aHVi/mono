<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-editable-text value="Change a few characters, then press Escape" @cancel="onCancel"></web-ui-editable-text>
    <output class="text-sm text-(--wui-color-text-secondary)">{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const last = ref('No action yet')

function onCancel() {
  last.value = 'cancel: Escape restored the value to the state when editing began'
}
</script>
