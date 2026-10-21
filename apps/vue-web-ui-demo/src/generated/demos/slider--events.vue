<template>
  <div class="flex flex-wrap items-center gap-5">
    <web-ui-slider
      marks
      :step="5"
      :min="10"
      :max="90"
      :value="inputValue"
      @input="inputValue = $event.currentTarget.value"
      @change="changeValue = $event.currentTarget.value"
    ></web-ui-slider>
    <output class="text-sm text-(--wui-color-text-secondary)">
      input: {{ inputValue }} / change: {{ changeValue }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const inputValue = ref(40)
const changeValue = ref(40)
</script>
