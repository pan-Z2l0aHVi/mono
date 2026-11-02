<template>
  <div class="flex flex-col gap-3">
    <web-ui-textarea aria-label="Notes" clearable placeholder="With a prefix icon">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="16"></web-ui-icon>
    </web-ui-textarea>
    <web-ui-textarea aria-label="Feedback" clearable placeholder="Both prefix and suffix are text">
      <span slot="prefix">Notes: </span>
      <span slot="suffix">up to 200 characters</span>
    </web-ui-textarea>
  </div>
</template>

<script setup lang="ts">
import { lucideFileText } from '@greypan/web-ui/icons'
</script>
