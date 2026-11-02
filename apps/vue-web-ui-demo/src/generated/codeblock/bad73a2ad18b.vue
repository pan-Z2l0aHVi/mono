<template>
  <div class="flex flex-wrap items-center gap-8">
    <web-ui-badge :count="5">
      <web-ui-button variant="secondary">Messages</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="7">
      <web-ui-icon :icon="lucideBell" :size="22"></web-ui-icon>
    </web-ui-badge>

    <web-ui-badge :count="0">
      <web-ui-button variant="secondary">Drafts (count is 0)</web-ui-button>
    </web-ui-badge>

    <web-ui-badge :count="0" show-zero>
      <web-ui-button variant="secondary">Inbox (show-zero)</web-ui-button>
    </web-ui-badge>
  </div>
</template>

<script setup lang="ts">
import { lucideBell } from '@greypan/web-ui/icons'
</script>
