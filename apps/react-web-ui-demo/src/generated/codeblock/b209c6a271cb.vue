<template>
  <div class="flex flex-wrap items-start gap-4">
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">Default: the panel is clipped by the container</span>
      <web-ui-select placeholder="Default">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>
    <div class="flex h-24 flex-col items-start gap-2 overflow-hidden rounded-lg border border-(--wui-color-border) p-3">
      <span class="text-xs text-(--wui-color-text-secondary)">portal: the panel is fully visible</span>
      <web-ui-select portal placeholder="portal">
        <web-ui-option value="a" label="Option A"></web-ui-option>
        <web-ui-option value="b" label="Option B"></web-ui-option>
      </web-ui-select>
    </div>
  </div>
</template>
