<template>
  <div class="flex flex-col items-start gap-3">
    <div class="flex flex-wrap gap-2">
      <web-ui-button @click="showSuccess">success</web-ui-button>
      <web-ui-button @click="showInfo">info</web-ui-button>
      <web-ui-button @click="showWarning">warning</web-ui-button>
      <web-ui-button @click="showError">error</web-ui-button>
    </div>
    <output class="text-sm text-(--wui-color-text-secondary)">最近创建的 id：{{ last }}</output>
  </div>
</template>

<script setup lang="ts">
import { toast } from '@greypan/web-ui'
import { onBeforeUnmount, ref } from 'vue'

const last = ref('—')

function showSuccess() {
  last.value = toast.success('操作成功')
}

function showInfo() {
  last.value = toast.info('提示信息')
}

function showWarning() {
  last.value = toast.warning('请注意')
}

function showError() {
  last.value = toast.error('出错了')
}

onBeforeUnmount(() => toast.clear())
</script>
