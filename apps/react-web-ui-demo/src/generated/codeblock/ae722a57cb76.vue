<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input aria-label="Search" clearable placeholder="Search components">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
    <web-ui-input aria-label="Website" value="web-ui">
      <span slot="prefix">www.</span>
      <span slot="suffix">.com</span>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
