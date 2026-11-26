<script setup lang="ts">
import { clamp, formatFileSize } from '@greypan/js-kit'
import { computed, ref } from 'vue'

const rawVal = ref(120)
const minVal = ref(0)
const maxVal = ref(100)
const bytes = ref(1_572_864)
const decimals = ref(2)

const clamped = computed(() => clamp(rawVal.value, minVal.value, maxVal.value))
const formattedSize = computed(() => formatFileSize(bytes.value, decimals.value))
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-2">
    <div class="flex flex-col gap-2">
      <div class="text-sm font-medium">clamp(val, min, max)</div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <label class="flex items-center gap-1">
          val
          <input
            v-model.number="rawVal"
            type="number"
            class="w-20 rounded border border-(--wui-color-border) px-2 py-1"
          />
        </label>
        <label class="flex items-center gap-1">
          min
          <input
            v-model.number="minVal"
            type="number"
            class="w-16 rounded border border-(--wui-color-border) px-2 py-1"
          />
        </label>
        <label class="flex items-center gap-1">
          max
          <input
            v-model.number="maxVal"
            type="number"
            class="w-16 rounded border border-(--wui-color-border) px-2 py-1"
          />
        </label>
      </div>
      <div class="font-mono text-sm">Result: {{ clamped }}</div>
    </div>

    <div class="flex flex-col gap-2">
      <div class="text-sm font-medium">formatFileSize(bytes, decimals)</div>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <label class="flex items-center gap-1">
          bytes
          <input
            v-model.number="bytes"
            type="number"
            class="w-28 rounded border border-(--wui-color-border) px-2 py-1"
          />
        </label>
        <label class="flex items-center gap-1">
          decimals
          <input
            v-model.number="decimals"
            type="number"
            min="0"
            max="6"
            class="w-16 rounded border border-(--wui-color-border) px-2 py-1"
          />
        </label>
      </div>
      <div class="font-mono text-sm">Result: {{ formattedSize }}</div>
    </div>
  </div>
</template>
