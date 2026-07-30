<route lang="json">
{
  "meta": {
    "title": "头像"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import AvatarDemo from '@/components/avatar-demo/index.vue'

useHead({
  title: () => '头像'
})
</script>

<template>
  <div class="p-3">
    <AvatarDemo />
  </div>
</template>
