<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="Zoom in">
      <web-ui-icon :icon="lucidePlus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Zoom out">
      <web-ui-icon :icon="lucideMinus"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
