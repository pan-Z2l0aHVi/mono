<script setup lang="ts">
import { monoDigitsClass, splitNumericSegments } from './presentation'

defineProps<{ message: string }>()
</script>

<template>
  <p
    v-if="message"
    role="alert"
    class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
  >
    <template v-for="(segment, index) in splitNumericSegments(message)" :key="index">
      <span v-if="segment.numeric" :class="monoDigitsClass">{{ segment.text }}</span>
      <template v-else>{{ segment.text }}</template>
    </template>
  </p>
</template>
