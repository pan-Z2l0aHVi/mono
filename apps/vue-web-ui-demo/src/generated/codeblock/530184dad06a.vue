<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete :value="text" placeholder="Type a framework name" @input="onInput" @change="onChange">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ text || '(empty)' }} · selected-value: {{ picked || '(empty)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const text = ref('')
const picked = ref('')

function onInput(event: WebUiEvent<WebUiAutocomplete, 'input'>) {
  text.value = event.currentTarget.value
}

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  text.value = event.currentTarget.value
  picked.value = event.currentTarget.selectedValue
}
</script>
