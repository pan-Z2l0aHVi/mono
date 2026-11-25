<script setup lang="ts">
import { parseUrl, stringifyUrl } from '@greypan/js-kit'
import { computed, ref } from 'vue'

const rawUrl = ref('https://example.com/search?q=mono&tag=a&tag=b#top')
const extraKey = ref('page')
const extraVal = ref('2')
const omitNil = ref(true)

const parsed = computed(() => parseUrl(rawUrl.value))
const rebuilt = computed(() =>
  stringifyUrl(
    {
      base: parsed.value.base,
      query: {
        ...parsed.value.query,
        ...(extraKey.value ? { [extraKey.value]: extraVal.value || undefined } : {})
      },
      hash: parsed.value.hash
    },
    omitNil.value
  )
)
</script>

<template>
  <div class="flex flex-col gap-3 text-sm">
    <input
      v-model="rawUrl"
      type="text"
      aria-label="待解析 URL"
      class="w-full rounded border border-(--wui-color-border) px-3 py-1.5 font-mono text-xs"
    />
    <div class="flex flex-wrap items-center gap-2 text-xs">
      <label class="flex items-center gap-1">
        附加 key
        <input
          v-model="extraKey"
          type="text"
          class="w-24 rounded border border-(--wui-color-border) px-2 py-1 font-mono"
        />
      </label>
      <label class="flex items-center gap-1">
        value
        <input
          v-model="extraVal"
          type="text"
          class="w-24 rounded border border-(--wui-color-border) px-2 py-1 font-mono"
        />
      </label>
      <label class="flex items-center gap-1"><input v-model="omitNil" type="checkbox" /> omitNil</label>
    </div>
    <pre class="overflow-x-auto rounded bg-(--wui-color-page) p-2 font-mono text-xs">{{
      JSON.stringify(parsed, null, 2)
    }}</pre>
    <div class="font-mono text-xs break-all">stringifyUrl: {{ rebuilt }}</div>
  </div>
</template>
