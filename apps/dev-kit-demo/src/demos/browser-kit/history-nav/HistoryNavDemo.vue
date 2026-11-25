<script setup lang="ts">
import { ref } from 'vue'

const sandboxUrl = `${import.meta.env.BASE_URL}sandbox/history-nav.html`
const reloadKey = ref(0)

function reloadSandbox() {
  reloadKey.value += 1
}
</script>

<template>
  <div class="flex flex-col gap-2 text-sm">
    <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>独立同源 iframe 沙箱运行 defineHistoryNav，不污染当前文档页路由历史。</span>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="reloadSandbox">重载沙箱</button>
    </div>
    <iframe
      :key="reloadKey"
      :src="sandboxUrl"
      title="history-nav sandbox"
      class="h-64 w-full rounded-md border border-border bg-background"
    />
  </div>
</template>
