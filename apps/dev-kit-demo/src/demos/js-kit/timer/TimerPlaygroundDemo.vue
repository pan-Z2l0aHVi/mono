<script setup lang="ts">
import { debounce, defineControllableInterval } from '@greypan/js-kit'
import { onBeforeUnmount, ref } from 'vue'

const inputText = ref('')
const rawCount = ref(0)
const debouncedCount = ref(0)
const debouncedValue = ref('')

const debouncer = debounce(
  (value: string) => {
    debouncedCount.value += 1
    debouncedValue.value = value
  },
  { waitMs: 350, timing: 'trailing' }
)

function onType(event: Event) {
  const val = (event.target as HTMLInputElement).value
  inputText.value = val
  rawCount.value += 1
  debouncer.call(val)
}

const ticks = ref(0)
const running = ref(false)
const paused = ref(false)

const interval = defineControllableInterval({
  callback: () => {
    ticks.value += 1
  },
  interval: 800
}).make()

function startTimer() {
  running.value = true
  paused.value = false
  interval.start()
}

function pauseTimer() {
  paused.value = true
  interval.pause()
}

function resumeTimer() {
  paused.value = false
  interval.resume()
}

function stopTimer() {
  running.value = false
  paused.value = false
  interval.stop()
}

onBeforeUnmount(() => {
  debouncer.cancel()
  interval.stop()
})
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2 text-sm">
    <div class="flex flex-col gap-2">
      <div class="font-medium">debounce (350ms)</div>
      <input
        :value="inputText"
        type="text"
        placeholder="快速输入观察防抖效果"
        aria-label="防抖测试输入"
        class="rounded border border-(--wui-color-border) px-3 py-1.5 text-xs"
        @input="onType"
      />
      <div class="font-mono text-xs">
        raw: {{ rawCount }} | debounced: {{ debouncedCount }} | value: {{ JSON.stringify(debouncedValue) }}
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="font-medium">defineControllableInterval (800ms)</div>
      <div class="flex flex-wrap gap-2">
        <web-ui-button variant="primary" size="28" @click="startTimer">启动</web-ui-button>
        <web-ui-button variant="secondary" size="28" :disabled="!running || paused" @click="pauseTimer"
          >暂停</web-ui-button
        >
        <web-ui-button variant="secondary" size="28" :disabled="!paused" @click="resumeTimer">恢复</web-ui-button>
        <web-ui-button variant="ghost" size="28" @click="stopTimer">停止</web-ui-button>
      </div>
      <div class="font-mono text-xs">
        ticks: {{ ticks }} | state: {{ running ? (paused ? 'paused' : 'running') : 'stopped' }}
      </div>
    </div>
  </div>
</template>
