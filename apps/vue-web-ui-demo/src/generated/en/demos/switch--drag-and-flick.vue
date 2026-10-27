<template>
  <div class="flex w-full flex-col items-start gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch @input="record('input')" @change="record('change')"></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">
        Press and drag the whole control; crossing the midpoint or flicking sets the value
      </span>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">
      {{ log.length === 0 ? 'Waiting for interaction' : log.join(' → ') }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const log = ref<string[]>([])

function record(name: string) {
  log.value = [...log.value.slice(-5), name]
}
</script>
