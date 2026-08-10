<script setup lang="ts">
import type { WebUiEvent, WebUiSwitch } from '@greypan/web-ui'
import { ref } from 'vue'

const enabled = ref(false)
const disabledState = ref(true)
const loadingState = ref(true)

function checkedFromEvent(event: WebUiEvent<WebUiSwitch, 'change'>): boolean {
  return event.currentTarget.checked
}
</script>

<template>
  <div>
    <h1>开关</h1>
    <h2>基本用法</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="enabled" @change="enabled = checkedFromEvent($event)" />
      <span class="text-sm text-gray-600">{{ enabled ? '开启' : '关闭' }}</span>
    </div>
    <h2>禁用状态</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="disabledState" disabled />
      <span class="text-sm text-gray-500">禁用</span>
    </div>
    <h2>加载中</h2>
    <div class="mb-3 flex items-center gap-3">
      <web-ui-switch :checked="loadingState" loading @change="loadingState = checkedFromEvent($event)" />
      <span class="text-sm text-gray-500">加载中</span>
    </div>
  </div>
</template>
