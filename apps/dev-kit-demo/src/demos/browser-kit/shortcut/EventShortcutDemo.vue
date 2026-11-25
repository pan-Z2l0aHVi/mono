<script setup lang="ts">
import { off, on } from '@greypan/browser-kit'
import { onBeforeUnmount, ref } from 'vue'

const listening = ref(false)
const events = ref<string[]>([])

function handleKeydown(event: KeyboardEvent) {
  const entry = `${new Date().toLocaleTimeString()} — key="${event.key}" code="${event.code}"`
  events.value = [entry, ...events.value.slice(0, 7)]
}

function toggleListener() {
  if (listening.value) {
    off(window, 'keydown', handleKeydown)
    listening.value = false
  } else {
    on(window, 'keydown', handleKeydown)
    listening.value = true
  }
}

onBeforeUnmount(() => {
  if (listening.value) {
    off(window, 'keydown', handleKeydown)
  }
})
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-2">
      <button type="button" class="ui-btn ui-btn-primary ui-btn-sm" @click="toggleListener">
        {{ listening ? '解绑 window keydown（off）' : '开启 window keydown 监听（on）' }}
      </button>
      <span class="text-xs text-muted-foreground">
        {{ listening ? '监听中：按下任意键查看事件记录' : '已暂停：未注册全局监听' }}
      </span>
    </div>

    <div class="min-h-20 rounded-md bg-muted/50 p-2 font-mono text-xs">
      <div v-if="events.length === 0" class="text-muted-foreground">暂无按键事件记录</div>
      <div v-for="(line, index) in events" :key="index">{{ line }}</div>
    </div>
  </div>
</template>
