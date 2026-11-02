<template>
  <div class="flex flex-wrap gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: vertical (default)</span>
      <web-ui-radio-group value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">Small</web-ui-radio>
        <web-ui-radio value="m">Medium</web-ui-radio>
      </web-ui-radio-group>
    </div>
  </div>
</template>
