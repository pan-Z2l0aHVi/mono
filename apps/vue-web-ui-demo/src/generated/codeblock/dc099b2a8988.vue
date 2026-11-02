<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon-only member</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="Previous page">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon via prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
          Previous
        </web-ui-button>
        <web-ui-button variant="secondary">
          Next
          <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">Text and icon mixed</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="Previous page">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">Page 1 / 3</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="Next page">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'
</script>
