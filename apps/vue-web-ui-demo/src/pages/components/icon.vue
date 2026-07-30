<route lang="json">
{
  "meta": {
    "title": "图标"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import IconDemo from '@/components/icon-demo/index.vue'

useHead({
  title: () => '图标'
})
</script>

<template>
  <div class="p-3">
    <IconDemo />
  </div>
</template>
