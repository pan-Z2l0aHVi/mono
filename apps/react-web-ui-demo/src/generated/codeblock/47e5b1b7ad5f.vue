<template>
  <web-ui-button @click="open = true">Open (no scroll lock)</web-ui-button>

  <web-ui-drawer
    :open="open"
    no-scroll-lock
    heading="Background still scrolls"
    @open-change="open = $event.detail.open"
  >
    <p>After opening, try scrolling the background page: no-scroll-lock does not rewrite page scrolling.</p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
