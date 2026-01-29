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
  <div className="p-12px">
    <h3>Welcome Home!</h3>
  </div>
</template>
