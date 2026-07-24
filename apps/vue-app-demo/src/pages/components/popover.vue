<route lang="json">
{
  "meta": {
    "title": "Popover"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import PopoverDemo from '@/components/popover-demo/index.vue'
useHead({ title: () => 'Popover' })
</script>

<template>
  <div class="p-3"><PopoverDemo /></div>
</template>
