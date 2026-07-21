<route lang="json">
{
  "meta": {
    "title": "输入框"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import InputDemo from '@/components/input-demo/index.vue'

useHead({
  title: () => '输入框'
})
</script>

<template>
  <div class="p-3">
    <InputDemo />
  </div>
</template>
