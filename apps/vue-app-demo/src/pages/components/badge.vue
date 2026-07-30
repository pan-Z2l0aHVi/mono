<route lang="json">
{
  "meta": {
    "title": "徽标"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import BadgeDemo from '@/components/badge-demo/index.vue'

useHead({
  title: () => '徽标'
})
</script>

<template>
  <div class="p-3">
    <BadgeDemo />
  </div>
</template>
