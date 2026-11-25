<script setup lang="ts">
import { safeCall } from '@greypan/js-kit'
import { ref } from 'vue'

const logs = ref<string[]>([])

function runOk() {
  safeCall(() => {
    logs.value = ['✓ sync ok', ...logs.value].slice(0, 6)
  })
}

function runSyncError() {
  safeCall(
    () => {
      throw new Error('sync boom')
    },
    {
      onError: error => {
        logs.value = [`✕ caught sync: ${(error as Error).message}`, ...logs.value].slice(0, 6)
      }
    }
  )
}

function runAsyncError() {
  safeCall(async () => Promise.reject(new Error('async boom')), {
    onError: error => {
      logs.value = [`✕ caught async: ${(error as Error).message}`, ...logs.value].slice(0, 6)
    }
  })
}
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap gap-2">
      <web-ui-button variant="primary" size="28" @click="runOk">正常执行</web-ui-button>
      <web-ui-button variant="secondary" size="28" @click="runSyncError">同步抛错</web-ui-button>
      <web-ui-button variant="secondary" size="28" @click="runAsyncError">异步 Rejection</web-ui-button>
    </div>
    <div class="rounded bg-(--wui-color-page) p-2 font-mono text-xs">
      <div v-if="!logs.length" class="text-(--wui-color-text-secondary)">点击按钮观察 safeCall 兜底捕获</div>
      <div v-for="(line, idx) in logs" :key="idx">{{ line }}</div>
    </div>
  </div>
</template>
