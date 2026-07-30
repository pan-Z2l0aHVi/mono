<route lang="json">
{
  "meta": {
    "title": "Toast 通知"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import ToastDemo from '@/components/toast-demo/index.vue'

useHead({
  title: () => 'Toast 通知'
})
</script>

<template>
  <div class="p-3">
    <ToastDemo />
  </div>
</template>
