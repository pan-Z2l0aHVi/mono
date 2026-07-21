<route lang="json">
{
  "meta": {
    "title": "对话框"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import DialogDemo from '@/components/dialog-demo/index.vue'

useHead({
  title: () => '对话框'
})
</script>

<template>
  <div class="p-3">
    <DialogDemo />
  </div>
</template>
