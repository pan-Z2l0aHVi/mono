<template>
  <div class="flex flex-wrap items-start gap-8">
    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">inset（默认）</span>
      <web-ui-segmented :value="insetView" @input="insetView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ insetView }}</output>
    </div>

    <div class="flex flex-col items-start gap-3">
      <span class="text-sm text-(--wui-color-text-secondary)">raised</span>
      <web-ui-segmented variant="raised" :value="raisedView" @input="raisedView = $event.currentTarget.value">
        <web-ui-segmented-trigger value="day">日</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="week">周</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="month">月</web-ui-segmented-trigger>
      </web-ui-segmented>
      <output class="text-sm text-(--wui-color-text-secondary)">选中值：{{ raisedView }}</output>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const insetView = ref('week')
const raisedView = ref('week')
</script>
