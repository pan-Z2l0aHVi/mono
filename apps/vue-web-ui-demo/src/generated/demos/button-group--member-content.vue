<template>
  <div class="flex flex-col items-start gap-5">
    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon-only 成员</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="上一页">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">icon 走 prefix / suffix</span>
      <web-ui-button-group>
        <web-ui-button variant="secondary">
          <web-ui-icon slot="prefix" :icon="lucideChevronLeft" :size="16"></web-ui-icon>
          上一页
        </web-ui-button>
        <web-ui-button variant="secondary">
          下一页
          <web-ui-icon slot="suffix" :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>

    <div class="flex flex-col items-start gap-2">
      <span class="text-xs text-(--wui-color-text-secondary)">文字与 icon 混排</span>
      <web-ui-button-group>
        <web-ui-button icon variant="secondary" aria-label="上一页">
          <web-ui-icon :icon="lucideChevronLeft" :size="16"></web-ui-icon>
        </web-ui-button>
        <web-ui-button variant="secondary">第 1 / 3 页</web-ui-button>
        <web-ui-button icon variant="secondary" aria-label="下一页">
          <web-ui-icon :icon="lucideChevronRight" :size="16"></web-ui-icon>
        </web-ui-button>
      </web-ui-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideChevronRight } from '@greypan/web-ui/icons'
</script>
