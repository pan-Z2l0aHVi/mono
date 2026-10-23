<route lang="json">
{
  "meta": {
    "title": "ContextMenu"
  }
}
</route>

<script setup lang="ts">
import ExampleDoc from '@/components/example-doc/index.vue'
</script>

<template>
  <ExampleDoc component="context-menu" level="primary" />
  <ExampleDoc component="dropdown-item" level="secondary" />
  <ExampleDoc component="dropdown-divider" level="secondary" />
  <ExampleDoc component="dropdown-header" level="secondary" />
</template>
