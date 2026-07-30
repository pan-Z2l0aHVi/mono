<script setup lang="ts">
import { ref } from 'vue'

const enabled = ref(false)
const disabledState = ref(true)
const loadingState = ref(true)
</script>

<template>
  <div>
    <h1>开关</h1>
    <h2>基本用法</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :open="enabled" @open-change="enabled = $event.detail.open" />
      <span class="text-sm text-gray-600">{{ enabled ? '开启' : '关闭' }}</span>
    </div>
    <h2>禁用状态</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :open="disabledState" disabled />
      <span class="text-sm text-gray-500">禁用</span>
    </div>
    <h2>加载中</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :open="loadingState" loading @open-change="loadingState = $event.detail.open" />
      <span class="text-sm text-gray-500">加载中</span>
    </div>
  </div>
</template>
