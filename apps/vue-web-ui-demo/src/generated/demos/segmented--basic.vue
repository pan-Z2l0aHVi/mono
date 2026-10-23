<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-segmented :value="day" @input="day = $event.currentTarget.value">
      <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
      <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
    </web-ui-segmented>
    <output class="text-sm text-(--wui-color-text-secondary)">当前选中：{{ day }}</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const day = ref('wed')
</script>
