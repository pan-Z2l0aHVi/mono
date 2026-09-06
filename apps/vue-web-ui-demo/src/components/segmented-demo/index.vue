<script setup lang="ts">
import { ref } from 'vue'

const basicVal = ref('mon')
const groupVal = ref('banana')
const disabledVal = ref('apple')
</script>

<template>
  <div>
    <h1>分段控制器</h1>

    <h2>基本用法</h2>
    <div class="mb-3">
      <web-ui-segmented :value="basicVal" @input="basicVal = $event.target.value">
        <web-ui-segmented-trigger value="mon">周一</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="tue">周二</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="wed">周三</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="thu">周四</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="fri">周五</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ basicVal }}</p>
    <p class="text-xs text-gray-400">💡 支持按住当前选中项平滑拖拽跟踪、松手吸附至最近选项及抛掷手势</p>

    <h2>禁用状态</h2>
    <div class="mb-3">
      <web-ui-segmented disabled :value="disabledVal" @input="disabledVal = $event.target.value">
        <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ disabledVal }}</p>

    <h2>Segmented Group</h2>
    <div class="mb-3">
      <web-ui-segmented :value="groupVal" @input="groupVal = $event.target.value">
        <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
        <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
      </web-ui-segmented>
    </div>
    <p class="text-sm text-gray-500">选中值：{{ groupVal }}</p>
  </div>
</template>
