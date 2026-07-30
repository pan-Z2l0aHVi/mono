<route lang="json">
{
  "meta": {
    "title": "Spinner"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SpinnerDemo from '@/components/spinner-demo/index.vue'
useHead({ title: () => 'Spinner' })
</script>

<template>
  <div class="p-3"><SpinnerDemo /></div>
</template>
