<route lang="json">
{
  "meta": {
    "title": "ContextMenu"
  }
}
</route>

<script setup lang="ts">
import ContextMenuDemo from '@/components/context-menu-demo/index.vue'
import ExampleDoc from '@/components/example-doc/index.vue'
</script>

<template>
  <ContextMenuDemo />
  <ExampleDoc component="context-menu" />
  <ExampleDoc component="dropdown-item" />
  <ExampleDoc component="dropdown-divider" />
  <ExampleDoc component="dropdown-header" />
</template>
