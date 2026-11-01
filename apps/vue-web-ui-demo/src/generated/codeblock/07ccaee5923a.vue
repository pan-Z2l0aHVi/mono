<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input
      full
      clearable
      :value="value"
      placeholder="Commits on blur after typing"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ value || '(empty)' }} / change: {{ committed || '(not committed)' }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
