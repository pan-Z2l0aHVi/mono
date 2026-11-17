<script setup lang="ts">
defineProps<{ message: string }>()
</script>

<template>
  <p
    v-if="message"
    role="alert"
    class="m-0 rounded-md bg-red-50 px-3 py-2 text-sm leading-5 text-red-700 dark:bg-red-400/12 dark:text-red-200"
  >
    {{ message }}
  </p>
</template>
