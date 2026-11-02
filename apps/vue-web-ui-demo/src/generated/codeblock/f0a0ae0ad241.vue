<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" @click="clicks += 1">Click me</web-ui-button>
    <web-ui-button variant="primary" disabled @click="clicks += 1">Disabled (clicks are not counted)</web-ui-button>
    <web-ui-button variant="primary" loading @click="clicks += 1">Loading (clicks are not counted)</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">click: {{ clicks }} times</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const clicks = ref(0)
</script>
