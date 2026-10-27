<template>
  <web-ui-segmented :value="view" @input="view = $event.currentTarget.value">
    <web-ui-segmented-trigger value="day">Day</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="week">Week</web-ui-segmented-trigger>
    <web-ui-segmented-trigger value="month">Month</web-ui-segmented-trigger>
  </web-ui-segmented>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const view = ref('day')
</script>
