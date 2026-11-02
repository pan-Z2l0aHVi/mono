<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('day')
</script>
