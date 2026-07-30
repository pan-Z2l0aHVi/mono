<route lang="json">
{
  "meta": {
    "title": "开关"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

import SwitchDemo from '@/components/switch-demo/index.vue'
useHead({ title: () => '开关' })
</script>

<template>
  <div class="p-3"><SwitchDemo /></div>
</template>
