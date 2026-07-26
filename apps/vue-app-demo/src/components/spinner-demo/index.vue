<script setup lang="ts">
import { WebUiSpinner } from '@greypan/web-ui'

function showSpinner() {
  WebUiSpinner.show()
}

function hideSpinner() {
  WebUiSpinner.hide()
}

function showTimedSpinner() {
  WebUiSpinner.show({ duration: 2000 })
}

function showSmallSpinner() {
  WebUiSpinner.show({ size: 16 })
}

function showLargeSpinner() {
  WebUiSpinner.show({ size: 64 })
}

function showSpinnerWithDescription() {
  WebUiSpinner.show({ description: '正在加载数据，请稍候...' })
}

function showSpinnerWithLongDescription() {
  WebUiSpinner.show({ description: '正在同步云端文件，预计需要 30 秒', duration: 5000 })
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

    <h2>声明式描述 slot</h2>
    <div class="mb-6">
      <web-ui-spinner :size="32">
        <span slot="description">加载中...</span>
      </web-ui-spinner>
    </div>

    <h2>命令式用法</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="showSpinner">show</web-ui-button>
      <web-ui-button @click="hideSpinner">hide</web-ui-button>
      <web-ui-button @click="showTimedSpinner">show (2s 后自动关闭)</web-ui-button>
    </div>

    <h2>命令式自定义尺寸</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button @click="showSmallSpinner">小尺寸 (16)</web-ui-button>
      <web-ui-button @click="showLargeSpinner">大尺寸 (64)</web-ui-button>
    </div>

    <h2>命令式描述文字</h2>
    <div class="mb-6 flex gap-2">
      <web-ui-button @click="showSpinnerWithDescription">带描述</web-ui-button>
      <web-ui-button @click="showSpinnerWithLongDescription">长描述 (5s)</web-ui-button>
    </div>
  </div>
</template>
