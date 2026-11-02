<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-button variant="secondary">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
      Search
    </web-ui-button>
    <web-ui-button variant="secondary">
      Next
      <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button variant="primary">
      <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
      Back
      <span slot="suffix" class="opacity-60">Enter</span>
    </web-ui-button>
    <web-ui-button>
      <span slot="prefix">prefix</span>
      button
      <span slot="suffix">suffix</span>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight, lucideSearch } from '@greypan/web-ui/icons'
</script>
