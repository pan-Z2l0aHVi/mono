<route lang="json">
{
  "meta": {
    "title": "抽屉"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import DrawerDemo from '@/components/drawer-demo/index.vue'

useHead({
  title: () => '抽屉'
})
</script>

<template>
  <div class="p-3">
    <DrawerDemo />
  </div>
</template>
