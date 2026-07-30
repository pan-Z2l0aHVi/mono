<route lang="json">
{
  "meta": {
    "title": "右键菜单"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import ContextMenuDemo from '@/components/context-menu-demo/index.vue'

useHead({
  title: () => '右键菜单'
})
</script>

<template>
  <div class="p-3">
    <ContextMenuDemo />
  </div>
</template>
