<route lang="json">
{
  "meta": {
    "title": "Checkbox"
  }
}
</route>

<script setup lang="ts">
import CheckboxDemo from '@/components/checkbox-demo/index.vue'
import ExampleDoc from '@/components/example-doc/index.vue'
</script>

<template>
  <CheckboxDemo />
  <ExampleDoc component="checkbox" />
  <ExampleDoc component="checkbox-group" />
</template>
