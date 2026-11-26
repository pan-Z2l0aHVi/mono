<script setup lang="ts">
import { err, isOk, ok, type Result } from '@greypan/js-kit/rust'
import { computed, ref } from 'vue'

const rawInput = ref('42')

const result = computed<Result<number, string>>(() => {
  const num = Number(rawInput.value)
  if (!rawInput.value.trim() || !Number.isFinite(num) || num <= 0) {
    return err('Expected a positive number')
  }
  return ok(num * 2)
})
</script>

<template>
  <div class="flex flex-col gap-2 text-sm">
    <div class="flex items-center gap-2">
      <input
        v-model="rawInput"
        type="text"
        aria-label="输入数字"
        class="w-40 rounded border border-(--wui-color-border) px-2 py-1 font-mono text-xs"
      />
      <span class="font-mono text-xs">
        {{ isOk(result) ? `Ok(${result.value})` : `Err(${JSON.stringify(result.error)})` }}
      </span>
    </div>
  </div>
</template>
