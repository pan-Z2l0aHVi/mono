<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" size="28">Small 28</web-ui-button>
    <web-ui-button variant="primary">默认 36</web-ui-button>
    <web-ui-button variant="primary" size="48">Large 48</web-ui-button>
    <web-ui-button icon size="48" aria-label="大号搜索">
      <web-ui-icon :icon="lucideSearch" :size="20"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
