<script setup lang="ts">
import type { WebUiEvent, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

const enabled = ref(false)
const disabledState = ref(true)
const loadingState = ref(true)

function checkedFromEvent(event: WebUiEvent<WebUiSwitch, 'change'>): boolean {
  return event.currentTarget.checked
}
</script>

<template>
  <div>
    <h1>switch</h1>
    <h2>Basic usage</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="enabled" @change="enabled = checkedFromEvent($event)">Notifications</web-ui-switch>
      <span class="text-sm text-gray-600">{{ enabled ? 'On' : 'Close' }}</span>
    </div>
    <p class="text-xs text-gray-400">
      💡 Tap to switch instantly, drag across the whole track to track smoothly, or flick to throw
    </p>
    <h2>Disabled</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="disabledState" disabled>Disabled option</web-ui-switch>
      <span class="text-sm text-gray-500">Disabled</span>
    </div>
    <h2>Loading</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="loadingState" loading @change="loadingState = checkedFromEvent($event)"
        >Loading example</web-ui-switch
      >
      <span class="text-sm text-gray-500">Loading</span>
    </div>
  </div>
</template>
