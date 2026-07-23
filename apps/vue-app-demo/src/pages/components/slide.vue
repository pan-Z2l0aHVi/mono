<route lang="json">
{
  "meta": {
    "title": "滑块"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SlideDemo from '@/components/slide-demo/index.vue'

useHead({ title: () => '滑块' })
</script>

<template>
  <div class="p-3"><SlideDemo /></div>
</template>
