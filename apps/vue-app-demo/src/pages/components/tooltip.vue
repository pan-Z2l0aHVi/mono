<script setup lang="ts">
import { useHead } from '@unhead/vue'

import TooltipDemo from '@/components/tooltip-demo/index.vue'

useHead({
  title: () => '工具提示'
})
</script>

<template>
  <div class="p-3">
    <TooltipDemo />
  </div>
</template>
