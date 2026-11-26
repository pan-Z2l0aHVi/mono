<script setup lang="ts">
import { defineAckQueue } from '@greypan/js-kit'
import { ref } from 'vue'

const nextId = ref(0)
const paused = ref(false)
const simulateFail = ref(false)
const snapshot = ref<number[]>([])
const logs = ref<string[]>([])

const queue = defineAckQueue<{ id: number }>({
  onPersist: items => {
    snapshot.value = items.map(i => i.id)
  },
  onConsume: async item => {
    if (simulateFail.value) throw new Error(`consumer failed on #${item.id}`)
    logs.value = [`✓ consumed #${item.id}`, ...logs.value].slice(0, 8)
  },
  onConsumeError: (_err, item) => {
    logs.value = [`✕ failed #${item.id} (kept in queue)`, ...logs.value].slice(0, 8)
  }
}).make()

function enqueueItem() {
  nextId.value += 1
  queue.enqueue({ id: nextId.value })
}

function togglePause() {
  paused.value = !paused.value
  if (paused.value) queue.pause()
  else queue.resume()
}

function flushQueue() {
  void queue.flush()
}
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-2">
      <web-ui-button variant="primary" size="28" @click="enqueueItem">入队</web-ui-button>
      <web-ui-button variant="secondary" size="28" @click="togglePause">{{ paused ? '恢复' : '暂停' }}</web-ui-button>
      <web-ui-button variant="secondary" size="28" @click="flushQueue">重试 Flush</web-ui-button>
      <label class="flex items-center gap-1 text-xs"
        ><input v-model="simulateFail" type="checkbox" /> 模拟消费失败</label
      >
    </div>
    <div class="font-mono text-xs">Pending snapshot: [{{ snapshot.join(', ') }}]</div>
    <div class="rounded bg-(--wui-color-page) p-2 font-mono text-xs">
      <div v-if="!logs.length" class="text-(--wui-color-text-secondary)">暂无消费记录</div>
      <div v-for="(line, idx) in logs" :key="idx">{{ line }}</div>
    </div>
  </div>
</template>
