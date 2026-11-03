<template>
  <web-ui-button @click="open = true">Open (page steps aside)</web-ui-button>

  <web-ui-drawer
    :open="open"
    page-shift
    heading="The page steps aside for the drawer"
    @open-change="open = $event.detail.open"
  >
    <p>
      Opening slides the background page aside by a distance and it returns when the drawer closes; dragging this panel
      leaves the page in place.
    </p>
  </web-ui-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const open = ref(false)
</script>
