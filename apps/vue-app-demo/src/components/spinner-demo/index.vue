<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function showSpinner() {
  WebUiSpinner.show({ size: 48 })
}

function hideSpinner() {
  WebUiSpinner.hide()
}

function showTimedSpinner() {
  WebUiSpinner.show({ size: 48, duration: 2000 })
}
</script>

<template>
  <div>
    <h1>Spinner 加载指示器</h1>

    <h2>声明式用法</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-spinner :size="16"></web-ui-spinner>
      <web-ui-spinner :size="24"></web-ui-spinner>
      <web-ui-spinner :size="32"></web-ui-spinner>
    </div>

    <h2>命令式用法</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="showSpinner">show</web-ui-button>
      <web-ui-button @click="hideSpinner">hide</web-ui-button>
      <web-ui-button @click="showTimedSpinner">show (2s 后自动关闭)</web-ui-button>
    </div>
  </div>
</template>
