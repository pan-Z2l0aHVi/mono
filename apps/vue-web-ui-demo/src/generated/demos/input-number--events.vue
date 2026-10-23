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
      跟随 input：{{ live }} · 只在提交点变化的 change：{{ committed }}
    </output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const live = ref(1)
const committed = ref(1)
</script>
