<template>
  <web-ui-button-group direction="vertical">
    <web-ui-button icon variant="secondary" aria-label="Zoom in">
      <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Zoom out">
      <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
  </web-ui-button-group>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus, lucideSearch } from '@greypan/web-ui/icons'
</script>
