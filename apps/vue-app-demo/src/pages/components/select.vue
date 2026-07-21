<route lang="json">
{
  "meta": {
    "title": "下拉选择"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SelectDemo from '@/components/select-demo/index.vue'

useHead({
  title: () => '下拉选择'
})
</script>

<template>
  <div class="p-3">
    <SelectDemo />
  </div>
</template>
