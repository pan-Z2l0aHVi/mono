<route lang="json">
{
  "meta": {
    "title": "按钮"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import ButtonDemo from '@/components/button-demo/index.vue'

useHead({
  title: () => '按钮'
})
</script>

<template>
  <div class="p-3">
    <ButtonDemo />
  </div>
</template>
