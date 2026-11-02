<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch checked disabled></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">disabled：开着但改不动</span>
    </div>
    <div class="flex items-center gap-3">
      <web-ui-switch checked loading></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">loading：保持当前值等结果</span>
    </div>
  </div>
</template>
