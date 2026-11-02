<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 4px (default)</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">Left</web-ui-button>
        <web-ui-button variant="secondary">Middle</web-ui-button>
        <web-ui-button variant="secondary">Right</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1: 12px, the divider does not follow</span>
      <web-ui-button-group class="[--wui-space-1:12px]">
        <web-ui-button variant="secondary">Left</web-ui-button>
        <web-ui-button variant="secondary">Middle</web-ui-button>
        <web-ui-button variant="secondary">Right</web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
