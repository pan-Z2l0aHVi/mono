<script setup lang="ts">
import { getFileExtension } from '@greypan/js-kit'
import { computed, ref } from 'vue'

const filename = ref('archive.tar.gz')
const extension = computed(() => getFileExtension(filename.value))
</script>

<template>
  <div class="flex flex-wrap items-center gap-3 text-sm">
    <input
      v-model="filename"
      type="text"
      aria-label="文件名"
      class="min-w-56 rounded border border-(--wui-color-border) px-3 py-1.5 font-mono text-xs"
    />
    <span class="font-mono text-xs">getFileExtension → {{ JSON.stringify(extension) }}</span>
  </div>
</template>
