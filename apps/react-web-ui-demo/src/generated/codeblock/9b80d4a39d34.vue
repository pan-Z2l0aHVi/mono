<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">横排：分割线 12px</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:12px]">
        <web-ui-button variant="secondary">左</web-ui-button>
        <web-ui-button variant="secondary">中</web-ui-button>
        <web-ui-button variant="secondary">右</web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">竖排：同一条变量给的是宽度</span>
      <web-ui-button-group class="[--wui-button-group-divider-length:32px]" direction="vertical">
        <web-ui-button icon variant="secondary" aria-label="放大">
          <web-ui-icon :icon="lucidePlus" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="缩小">
          <web-ui-icon :icon="lucideMinus" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideMinus, lucidePlus } from '@greypan/web-ui/icons'
</script>
