<template>
  <div class="flex flex-wrap gap-8">
    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: vertical（默认）</span>
      <web-ui-checkbox-group :value="['apple']">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>

    <div class="flex flex-col gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">direction: horizontal</span>
      <web-ui-checkbox-group direction="horizontal" :value="['apple']">
        <web-ui-checkbox value="apple">Apple</web-ui-checkbox>
        <web-ui-checkbox value="banana">Banana</web-ui-checkbox>
      </web-ui-checkbox-group>
    </div>
  </div>
</template>
