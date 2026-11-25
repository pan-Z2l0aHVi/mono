<script setup lang="ts">
import { defineBatchEmitter } from '@greypan/js-kit'
import { ref } from 'vue'

const delay = ref(400)
const seq = ref(0)
const logs = ref<string[]>([])

const emitter = defineBatchEmitter<{ id: number }>({
  onFlushed: items => {
    logs.value = [`Flushed ${items.length} item(s): [${items.map(i => i.id).join(', ')}]`, ...logs.value].slice(0, 8)
  }
}).make()

function emitOne() {
  seq.value += 1
  void emitter.batchEmit({ id: seq.value }, delay.value)
}

function flushNow() {
  void emitter.flush()
}
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-2">
      <label class="flex items-center gap-1 text-xs">
        delay (ms)
        <input
          v-model.number="delay"
          type="number"
          min="0"
          step="100"
          class="w-20 rounded border border-(--wui-color-border) px-2 py-1"
        />
      </label>
      <web-ui-button variant="primary" size="28" @click="emitOne">发送事件</web-ui-button>
      <web-ui-button variant="secondary" size="28" @click="flushNow">立即 Flush</web-ui-button>
    </div>
    <div class="rounded bg-(--wui-color-page) p-2 font-mono text-xs">
      <div v-if="!logs.length" class="text-(--wui-color-text-secondary)">点击“发送事件”观察批量合并输出</div>
      <div v-for="(line, idx) in logs" :key="idx">{{ line }}</div>
    </div>
  </div>
</template>
