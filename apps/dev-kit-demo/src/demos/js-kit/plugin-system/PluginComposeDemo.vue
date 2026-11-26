<script setup lang="ts">
import { definePlugin } from '@greypan/js-kit'
import { computed, ref } from 'vue'

const withLogger = ref(true)
const withAuth = ref(true)
const message = ref('hello mono')

const output = computed(() => {
  const base = definePlugin(() => ({ prefix: 'app' }))
  const withLog = withLogger.value
    ? base.use(definePlugin(() => ({ log: (msg: string) => `[log] ${msg}` })))
    : base.use(definePlugin(() => ({ log: (msg: string) => msg })))
  const final = withAuth.value
    ? withLog.use(definePlugin(() => ({ token: 'demo-token' }))).make()
    : withLog.use(definePlugin(() => ({ token: '(none)' }))).make()
  return `${final.prefix}: ${final.log(message.value)} (token=${final.token})`
})
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <div class="flex flex-wrap items-center gap-4">
      <label class="flex items-center gap-1.5"><input v-model="withLogger" type="checkbox" /> Logger 插件</label>
      <label class="flex items-center gap-1.5"><input v-model="withAuth" type="checkbox" /> Auth 插件</label>
      <input
        v-model="message"
        type="text"
        aria-label="消息内容"
        class="rounded border border-(--wui-color-border) px-2 py-1 text-xs"
      />
    </div>
    <div class="rounded bg-(--wui-color-page) px-3 py-2 font-mono text-xs">{{ output }}</div>
  </div>
</template>
