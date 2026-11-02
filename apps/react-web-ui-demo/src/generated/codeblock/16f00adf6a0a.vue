<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button icon aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="secondary" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="ghost" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="danger" aria-label="Search">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon variant="primary" loading aria-label="Loading">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-button>
    <web-ui-button icon aria-label="Plus">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" />
      </svg>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
