<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1：4px（默认）</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">--wui-space-1：12px，分割线不跟着走</span>
      <web-ui-button-group class="[--wui-space-1:12px]">
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>
