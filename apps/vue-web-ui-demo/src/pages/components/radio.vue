<route lang="json">
{
  "meta": {
    "title": "单选框"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import RadioDemo from '@/components/radio-demo/index.vue'
useHead({ title: () => '单选框' })
</script>

<template>
  <div class="p-3"><RadioDemo /></div>
</template>
