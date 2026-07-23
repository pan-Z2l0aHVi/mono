<route lang="json">
{
  "meta": {
    "title": "分段控制器"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SegmentedDemo from '@/components/segmented-demo/index.vue'
useHead({ title: () => '分段控制器' })
</script>

<template>
  <div class="p-3"><SegmentedDemo /></div>
</template>
