<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-autocomplete allow-custom-value placeholder="输入候选之外的文本后按 Enter" @change="onChange">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
    <output class="text-sm text-(--wui-color-text-secondary)">
      最近提交：{{ submitted || '(空)' }} · selected-value：{{ selected || '(空)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import type { WebUiAutocomplete, WebUiEvent } from '@greypan/web-ui'
import { ref } from 'vue'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const submitted = ref('')
const selected = ref('')

function onChange(event: WebUiEvent<WebUiAutocomplete, 'change'>) {
  submitted.value = event.currentTarget.value
  selected.value = event.currentTarget.selectedValue
}
</script>
