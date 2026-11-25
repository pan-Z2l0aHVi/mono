<script setup lang="ts">
import { defineLocal } from '@greypan/browser-kit'
import { computed, onBeforeUnmount, ref } from 'vue'

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

const unwatch = store.watch<string>(keyInput.value, next => {
  lastRead.value = next
  statusMsg.value = '收到跨标签页 storage 更新'
})

const displayValue = computed(() => (lastRead.value === null ? 'null' : JSON.stringify(lastRead.value)))

onBeforeUnmount(() => {
  unwatch()
})

refresh()
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="grid gap-2 sm:grid-cols-3">
      <label class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">键名</span>
        <input v-model="keyInput" class="ui-input" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">值</span>
        <input v-model="valueInput" class="ui-input" />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-xs text-muted-foreground">TTL（ms，0 表示不过期）</span>
        <input v-model.number="ttlMs" type="number" min="0" step="1000" class="ui-input" />
      </label>
    </div>

    <div class="flex flex-wrap gap-2">
      <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" @click="handleSave">写入</button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="handleRead">读取</button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="handleRemove">删除</button>
      <button type="button" class="ui-btn ui-btn-outline ui-btn-sm" @click="handleSweep">清理过期键</button>
    </div>

    <div class="rounded-md bg-muted/50 px-3 py-2 font-mono text-xs">
      <div>has("{{ keyInput }}"): {{ hasKey }}</div>
      <div>get("{{ keyInput }}"): {{ displayValue }}</div>
      <div v-if="statusMsg" class="mt-1 text-muted-foreground">{{ statusMsg }}</div>
    </div>
  </div>
</template>
