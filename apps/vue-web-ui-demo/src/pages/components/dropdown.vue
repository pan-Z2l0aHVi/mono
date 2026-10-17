<route lang="json">
{
  "meta": {
    "title": "Dropdown 下拉菜单"
  }
}
</route>

<script setup lang="ts">
import DropdownDemo from '@/components/dropdown-demo/index.vue'
import ExampleDoc from '@/components/example-doc/index.vue'
</script>

<template>
  <DropdownDemo />
  <ExampleDoc component="dropdown" />
  <ExampleDoc component="dropdown-item" />
  <ExampleDoc component="dropdown-divider" />
  <ExampleDoc component="dropdown-header" />
</template>
