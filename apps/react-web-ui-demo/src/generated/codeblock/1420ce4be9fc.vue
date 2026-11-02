<template>
  <div class="flex w-full max-w-md flex-col items-start gap-4">
    <web-ui-collapse horizontal class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        <web-ui-icon class="align-[-2px]" :icon="radixIconsPanelLeftMinimized" :size="14"></web-ui-icon>
        Expand sidebar
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">
          The content area expands along the width, and the trigger stays on the same row.
        </div>
      </div>
    </web-ui-collapse>

    <web-ui-collapse horizontal peek="120px" class="flex items-center gap-2">
      <button type="button" class="flex-none cursor-pointer rounded-md bg-(--wui-color-surface-control) px-3 py-2">
        Horizontal peek
      </button>
      <div slot="content">
        <div class="w-64 whitespace-nowrap p-3 text-sm">
          When closed it exposes 120px of width, with the fade band on the right edge.
        </div>
      </div>
    </web-ui-collapse>
  </div>
</template>

<script setup lang="ts">
import { radixIconsPanelLeftMinimized } from '@greypan/web-ui/icons'
</script>
