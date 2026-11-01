<template>
  <web-ui-dropdown>
    <web-ui-button slot="trigger" variant="secondary">File</web-ui-button>
    <web-ui-dropdown-header>Edit</web-ui-dropdown-header>
    <web-ui-dropdown-item value="copy">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideCopy"></web-ui-icon>Copy
      <span slot="suffix" class="opacity-40">⌘C</span>
    </web-ui-dropdown-item>
    <web-ui-dropdown-item value="delete" disabled>
      <web-ui-icon slot="prefix" :size="14" :icon="lucideTrash2"></web-ui-icon>Delete
      <span slot="suffix" class="opacity-40">⌘⌫</span>
    </web-ui-dropdown-item>
  </web-ui-dropdown>
</template>

<script setup lang="ts">
import { lucideCopy, lucideTrash2 } from '@greypan/web-ui/icons'
</script>
