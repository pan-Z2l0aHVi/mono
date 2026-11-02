<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete placeholder="Select Beijing, then delete one character" @input="onInput" @change="onChange">
      <web-ui-option v-for="city in cities" :key="city.value" :value="city.value" :label="city.label"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ text || '(empty)' }} · selected-value: {{ liveSelected || '(empty)' }}
    </output>
    <output class="text-sm text-(--wui-color-text-secondary)">
      selected-value of the latest change: {{ committed || '(empty)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const cities = [
  { label: 'Beijing', value: 'beijing' },
  { label: 'Shanghai', value: 'shanghai' },
  { label: 'Guangzhou', value: 'guangzhou' },
  { label: 'Shenzhen', value: 'shenzhen' }
]
const text = ref('')
const liveSelected = ref('')
const committed = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  const host = event.currentTarget
  text.value = host.value
  // selected-value is derived during the component's update cycle; only the next frame reads the value matching the current text
  requestAnimationFrame(() => (liveSelected.value = host.selectedValue))
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  liveSelected.value = event.currentTarget.selectedValue
  committed.value = event.currentTarget.selectedValue
}
</script>
