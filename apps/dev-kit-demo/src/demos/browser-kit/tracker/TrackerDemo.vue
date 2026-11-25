<script setup lang="ts">
import {
  defineBatchTrack,
  defineLastWords,
  defineOfflineRestore,
  definePageErrors,
  defineTracker
} from '@greypan/browser-kit'
import { onBeforeUnmount, ref } from 'vue'

interface SentBatch {
  id: number
  at: string
  payload: object
}

const paused = ref(false)
const sentLog = ref<SentBatch[]>([])
const queuedCount = ref(0)
let seq = 0

const tracker = defineTracker({
  url: '/demo/intercepted-track',
  persistenceKey: 'dev-kit-demo-tracker',
  transport: async payload => {
    seq += 1
    sentLog.value = [
      {
        id: seq,
        at: new Date().toLocaleTimeString(),
        payload
      },
      ...sentLog.value.slice(0, 9)
    ]
    queuedCount.value = 0
  }
})
  .use(defineBatchTrack({ defaultBatchDelay: 600, maxBatchKB: 64 }))
  .use(defineOfflineRestore())
  .use(defineLastWords())
  .use(definePageErrors({ maxErrors: 10, dedupeWindowMs: 2000 }))
  .make()

function trackEvent(eventName: string) {
  queuedCount.value += 1
  tracker.track({ event: eventName, ts: Date.now() })
}

async function toggleOffline() {
  if (paused.value) {
    paused.value = false
    await tracker.resume()
  } else {
    paused.value = true
    tracker.pause()
  }
}

async function flushNow() {
  await tracker.flush()
}

function triggerSampleError() {
  // 主动触发一个受控的未处理 Promise 拒绝以演示 definePageErrors 捕获
  void Promise.reject(new Error('演示触发的未处理异常（已被内存 transport 拦截）'))
}

function clearLogs() {
  sentLog.value = []
}

onBeforeUnmount(() => {
  tracker.stop()
})
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" @click="trackEvent('button_click')">
        上报点击事件
      </button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="trackEvent('page_view')">
        上报浏览事件
      </button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="flushNow">立即 Flush</button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="toggleOffline">
        {{ paused ? '恢复在线（resume）' : '模拟离线（pause）' }}
      </button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="triggerSampleError">触发示例异常</button>
      <button type="button" class="ui-btn ui-btn-ghost ui-btn-sm" @click="clearLogs">清空日志</button>
    </div>

    <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
      <span>当前状态：{{ paused ? '已暂停（离线模拟）' : '运行中' }}</span>
      <span>待冲刷计数：{{ queuedCount }}</span>
      <span>已拦截批次：{{ sentLog.length }}</span>
    </div>

    <div class="max-h-48 overflow-auto rounded-md bg-muted/50 p-2 font-mono text-xs">
      <div v-if="sentLog.length === 0" class="text-muted-foreground">
        暂无上报记录。点击上方按钮触发批量聚合或立即 Flush（全部请求均由内存 transport 拦截，不会发出真实网络请求）。
      </div>
      <div v-for="entry in sentLog" :key="entry.id" class="border-b border-border/50 py-1 last:border-b-0">
        <span class="text-muted-foreground">#{{ entry.id }} [{{ entry.at }}]</span>
        {{ JSON.stringify(entry.payload) }}
      </div>
    </div>
  </div>
</template>
