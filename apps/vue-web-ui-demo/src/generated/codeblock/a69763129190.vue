<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-input-number
      :value="live"
      :min="0"
      :max="99"
      :step="1"
      @input="live = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-input-number>
    <output class="text-sm text-(--wui-color-text-secondary)">
      Follows input: {{ live }} · change, only at commit points: {{ committed }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const live = ref(1)
const committed = ref(1)
</script>
