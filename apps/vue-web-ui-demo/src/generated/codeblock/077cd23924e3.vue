<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock"></web-ui-icon>
      Default 18px
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="clock" :size="32" color="#007aff"></web-ui-icon>
      32px
    </span>
  </div>
</template>

<script setup lang="ts">
const clock = {
  width: 24,
  height: 24,
  body: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2" d="M12 7v5l3 3"/>'
}
</script>
