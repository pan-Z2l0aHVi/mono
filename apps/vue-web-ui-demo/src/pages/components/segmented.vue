<route lang="json">
{
  "meta": {
    "title": "Segmented"
  }
}
</route>

<script setup lang="ts">
import ExampleDoc from '@/components/example-doc/index.vue'
import SegmentedDemo from '@/components/segmented-demo/index.vue'
</script>

<template>
  <SegmentedDemo />
  <ExampleDoc component="segmented" />
  <ExampleDoc component="segmented-trigger" />
</template>
