<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="list">列表</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="grid" disabled>网格</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('list')
</script>
