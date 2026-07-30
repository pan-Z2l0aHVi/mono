<route lang="json">
{
  "meta": {
    "title": "复选框"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import CheckboxDemo from '@/components/checkbox-demo/index.vue'
useHead({ title: () => '复选框' })
</script>

<template>
  <div class="p-3"><CheckboxDemo /></div>
</template>
