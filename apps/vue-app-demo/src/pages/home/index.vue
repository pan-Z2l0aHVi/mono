<route lang="json">
{
  "meta": {
    "icon": "Home"
  }
}
</route>

<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: () => 'Home'
})
</script>

<template>
  <div class="p-3">
    <h3>Welcome Home!</h3>
    <p class="mt-2 text-gray-500">从左侧菜单选择一个组件查看演示。</p>
  </div>
</template>
