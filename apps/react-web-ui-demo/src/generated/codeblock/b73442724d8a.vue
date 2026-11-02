<template>
  <div class="flex items-center gap-3">
    <web-ui-switch :checked="enabled" @change="onChange"></web-ui-switch>
    <span class="text-sm text-(--wui-color-text-secondary)">{{ enabled ? 'On' : 'Off' }}</span>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

const enabled = ref(false)

function onChange(event: WebUiEvent<WebUiSwitch, 'change'>) {
  enabled.value = event.currentTarget.checked
}
</script>
