<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">Mon</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">Tue</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">Wed</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">Thu</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">Fri</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">Selected: {{ day }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const day = ref('wed')
</script>
