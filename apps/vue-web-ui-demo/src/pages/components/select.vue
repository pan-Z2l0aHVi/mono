<route lang="json">
{
  "meta": {
    "title": "Select"
  }
}
</route>

<script setup lang="ts">
import ExampleDoc from '@/components/example-doc/index.vue'
import SelectDemo from '@/components/select-demo/index.vue'
</script>

<template>
  <SelectDemo />
  <ExampleDoc component="select" />
  <ExampleDoc component="option" />
</template>
