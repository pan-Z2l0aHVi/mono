<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="list">List</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid" disabled>Grid</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
</script>
