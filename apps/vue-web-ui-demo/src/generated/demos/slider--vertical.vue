<template>
  <div class="flex items-start gap-10">
    <div class="flex flex-col items-center gap-3">
      <web-ui-slider vertical :value="brightness" @input="brightness = $event.currentTarget.value"></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ brightness }}</span>
    </div>

    <div class="flex flex-col items-center gap-3">
      <web-ui-slider
        vertical
        marks
        :step="10"
        :value="volume"
        @input="volume = $event.currentTarget.value"
      ></web-ui-slider>
      <span class="text-xs text-(--wui-color-text-secondary)">{{ volume }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const brightness = ref(60)
const volume = ref(30)
</script>
