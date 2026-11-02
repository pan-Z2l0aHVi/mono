<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="16"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">16</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">24 (default)</span>
    </span>
    <span class="flex flex-col items-center gap-2">
      <web-ui-spinner :size="48" aria-label="Submitting"></web-ui-spinner>
      <span class="text-xs text-(--wui-color-text-secondary)">48, with a custom accessible name</span>
    </span>
  </div>
</template>
