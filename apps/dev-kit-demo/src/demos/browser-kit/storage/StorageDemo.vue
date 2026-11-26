<script setup lang="ts">
import { defineLocal } from '@greypan/browser-kit'
import { computed, ref, watchEffect } from 'vue'

const store = defineLocal('dev-kit-demo-storage')

const keyInput = ref('session-token')
const valueInput = ref('hello-browser-kit')
const ttlMs = ref(5000)
const lastRead = ref<string | null>(null)
const hasKey = ref(false)
const statusMsg = ref('')

function refresh() {
  const val = store.get<string>(keyInput.value)
  lastRead.value = val
  hasKey.value = store.has(keyInput.value)
}

function handleSave() {
  const ttl = ttlMs.value > 0 ? ttlMs.value : undefined
  const ok = store.set(keyInput.value, valueInput.value, ttl)
  statusMsg.value = ok ? '已写入 localStorage' : '写入失败（存储受限）'
  refresh()
}

function handleRead() {
  refresh()
  statusMsg.value = lastRead.value === null ? '键不存在或已过期' : '读取成功'
}

function handleRemove() {
  store.remove(keyInput.value)
  statusMsg.value = '已删除键'
  refresh()
}

function handleSweep() {
  store.clearUseless()
  statusMsg.value = '已清理命名空间下过期键'
  refresh()
}

// 键名变更时自动解绑旧键的跨标签页监听并重新订阅当前键，避免串值。
watchEffect(onCleanup => {
  const activeKey = keyInput.value
  refresh()
  if (!activeKey) return
  const unwatch = store.watch<string>(activeKey, next => {
    lastRead.value = next
    hasKey.value = store.has(activeKey)
    statusMsg.value = '收到跨标签页 storage 更新'
  })
  onCleanup(() => {
    unwatch()
  })
})

const displayValue = computed(() => (lastRead.value === null ? 'null' : JSON.stringify(lastRead.value)))
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="grid gap-2 sm:grid-cols-3">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-(--wui-color-text-secondary)">键名</span>
        <input
          v-model="keyInput"
          class="w-full rounded border border-(--wui-color-border) bg-(--wui-color-surface) px-2.5 py-1.5 text-xs"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs text-(--wui-color-text-secondary)">值</span>
        <input
          v-model="valueInput"
          class="w-full rounded border border-(--wui-color-border) bg-(--wui-color-surface) px-2.5 py-1.5 text-xs"
        />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs text-(--wui-color-text-secondary)">TTL（ms，0 表示不过期）</span>
        <input
          v-model.number="ttlMs"
          type="number"
          min="0"
          step="1000"
          class="w-full rounded border border-(--wui-color-border) bg-(--wui-color-surface) px-2.5 py-1.5 text-xs"
        />
      </label>
    </div>

    <div class="flex flex-wrap gap-2">
      <web-ui-button variant="primary" size="32" @click="handleSave">写入</web-ui-button>
      <web-ui-button variant="secondary" size="32" @click="handleRead">读取</web-ui-button>
      <web-ui-button variant="secondary" size="32" @click="handleRemove">删除</web-ui-button>
      <web-ui-button variant="secondary" size="32" @click="handleSweep">清理过期键</web-ui-button>
    </div>

    <div class="rounded-md bg-(--wui-color-page) px-3 py-2 font-mono text-xs">
      <div>has("{{ keyInput }}"): {{ hasKey }}</div>
      <div>get("{{ keyInput }}"): {{ displayValue }}</div>
      <div v-if="statusMsg" class="mt-1 text-(--wui-color-text-secondary)">{{ statusMsg }}</div>
    </div>
  </div>
</template>
