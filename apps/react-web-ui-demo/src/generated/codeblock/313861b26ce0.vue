<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap items-center gap-3">
      <web-ui-select class="[--wui-input-width:140px]" :value="mode" @change="onModeChange">
        <web-ui-option value="contains" label="contains"></web-ui-option>
        <web-ui-option value="prefix" label="prefix"></web-ui-option>
        <web-ui-option value="none" label="none"></web-ui-option>
      </web-ui-select>
      <output class="text-sm text-(--wui-color-text-secondary)">Current mode: {{ mode }}</output>
    </div>
    <web-ui-autocomplete :filter="mode" placeholder="Type a framework name">
      <web-ui-option v-for="name in frameworks" :key="name" :value="name" :label="name"></web-ui-option>
    </web-ui-autocomplete>
  </div>
</template>

<script setup lang="ts">
import type { WebUiEvent, WebUiSelect } from '@greypan/web-ui'
import { ref } from 'vue'

type FilterMode = 'contains' | 'prefix' | 'none'

const frameworks = ['Vue', 'React', 'Svelte', 'Angular']
const mode = ref<FilterMode>('contains')

function onModeChange(event: WebUiEvent<WebUiSelect, 'change'>) {
  mode.value = event.currentTarget.value as FilterMode
}
</script>
