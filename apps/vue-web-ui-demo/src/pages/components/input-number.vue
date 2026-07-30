<route lang="json">
{
  "meta": {
    "title": "数字输入框"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import InputNumberDemo from '@/components/input-number-demo/index.vue'

useHead({
  title: () => '数字输入框'
})
</script>

<template>
  <div class="p-3">
    <InputNumberDemo />
  </div>
</template>
