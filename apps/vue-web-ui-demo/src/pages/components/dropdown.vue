<route lang="json">
{
  "meta": {
    "title": "下拉菜单"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import DropdownDemo from '@/components/dropdown-demo/index.vue'

useHead({
  title: () => '下拉菜单'
})
</script>

<template>
  <div class="p-3">
    <DropdownDemo />
  </div>
</template>
