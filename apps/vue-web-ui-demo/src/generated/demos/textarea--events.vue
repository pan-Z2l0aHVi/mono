<template>
  <div class="flex w-full flex-col gap-3">
    <web-ui-textarea
      full
      clearable
      :rows="4"
      :maxlength="20"
      :value="value"
      placeholder="最多 20 字，输入后失焦即提交"
      @input="value = $event.currentTarget.value"
      @change="committed = $event.currentTarget.value"
    ></web-ui-textarea>
    <div class="flex items-center gap-3 text-sm text-(--wui-color-text-secondary)">
      <output>input：{{ value.length }} / 20 · change：{{ committed ? `${committed.length} 字` : '(未提交)' }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const value = ref('')
const committed = ref('')
</script>
