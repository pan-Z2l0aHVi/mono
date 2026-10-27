<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-select
      aria-label="Frontend framework"
      :value="framework"
      placeholder="Select a framework"
      @change="framework = $event.currentTarget.value"
    >
      <web-ui-option value="vue" label="Vue"></web-ui-option>
      <web-ui-option value="react" label="React"></web-ui-option>
      <web-ui-option value="svelte" label="Svelte"></web-ui-option>
    </web-ui-select>
    <div class="flex items-center gap-3">
      <web-ui-button @click="framework = ''">Clear</web-ui-button>
      <output class="text-sm text-(--wui-color-text-secondary)">Current value: {{ framework || '(empty)' }}</output>
    </div>
    <web-ui-select placeholder="Disabled" disabled>
      <web-ui-option value="a" label="Unavailable"></web-ui-option>
    </web-ui-select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const framework = ref('vue')
</script>
