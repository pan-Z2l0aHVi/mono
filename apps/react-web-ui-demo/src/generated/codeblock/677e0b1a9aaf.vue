<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center gap-3">
      <web-ui-switch checked disabled></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">disabled: on, but cannot be changed</span>
    </div>
    <div class="flex items-center gap-3">
      <web-ui-switch checked loading></web-ui-switch>
      <span class="text-sm text-(--wui-color-text-secondary)">loading: keeps the current value while waiting</span>
    </div>
  </div>
</template>
