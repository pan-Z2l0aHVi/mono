<script setup lang="ts">
import { ref } from 'vue'

const basicVal = ref('mon')
const groupVal = ref('banana')
const disabledVal = ref('apple')
const insetVal = ref('banana')
const raisedVal = ref('banana')
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

    <h2>变体</h2>
    <p class="mb-3 text-sm text-gray-500">variant 控制轨道与静止指示器材质，默认 inset。</p>
    <div class="mb-3 flex flex-wrap gap-8">
      <div>
        <p class="mb-1 text-sm text-gray-500">variant="inset"（默认）</p>
        <web-ui-segmented :value="insetVal" @input="insetVal = $event.target.value">
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
        <p class="mt-1 text-sm text-gray-500">选中值：{{ insetVal }}</p>
      </div>
      <div>
        <p class="mb-1 text-sm text-gray-500">variant="raised"</p>
        <web-ui-segmented variant="raised" :value="raisedVal" @input="raisedVal = $event.target.value">
          <web-ui-segmented-trigger value="apple">Apple</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="banana">Banana</web-ui-segmented-trigger>
          <web-ui-segmented-trigger value="cherry">Cherry</web-ui-segmented-trigger>
        </web-ui-segmented>
        <p class="mt-1 text-sm text-gray-500">选中值：{{ raisedVal }}</p>
      </div>
    </div>
    <p class="text-xs text-gray-400">💡 两种 variant 的按压/拖拽指示器同为透明玻璃（backdrop blur、1.5x 缩放）</p>
  </div>
</template>
