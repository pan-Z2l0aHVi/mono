<route lang="json">
{
  "meta": {
    "title": "文本域"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import TextareaDemo from '@/components/textarea-demo/index.vue'

useHead({
  title: () => '文本域'
})
</script>

<template>
  <div class="p-3">
    <TextareaDemo />
  </div>
</template>
