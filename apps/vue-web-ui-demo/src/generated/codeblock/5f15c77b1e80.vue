<template>
  <div class="flex flex-wrap gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: vertical（默认）</span>
      <web-ui-radio-group value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
      </web-ui-radio-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-radio-group direction="horizontal" value="s">
        <web-ui-radio value="s">小</web-ui-radio>
        <web-ui-radio value="m">中</web-ui-radio>
      </web-ui-radio-group>
    </div>
  </div>
</template>
