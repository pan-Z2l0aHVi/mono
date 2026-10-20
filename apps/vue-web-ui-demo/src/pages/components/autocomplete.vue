<route lang="json">
{
  "meta": {
    "title": "Autocomplete"
  }
}
</route>

<script setup lang="ts">
import AutocompleteDemo from '@/components/autocomplete-demo/index.vue'
import ExampleDoc from '@/components/example-doc/index.vue'
</script>

<template>
  <AutocompleteDemo />
  <ExampleDoc component="autocomplete" />
  <ExampleDoc component="option" />
</template>
