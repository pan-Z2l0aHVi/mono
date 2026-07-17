<script setup lang="ts">
import { lucideArrowUpToLine, lucideLoaderCircle } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h2>基础用法</h2>
    <div class="mb-12px flex items-center gap-16px">
      <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
      <web-ui-icon :icon="lucideLoaderCircle"></web-ui-icon>
    </div>

    <h2>Spin 动画</h2>
    <div class="mb-12px flex items-center gap-16px">
      <web-ui-icon :icon="lucideLoaderCircle" spin></web-ui-icon>
      <span>加载中...</span>
    </div>

    <h2>搭配 Button</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button variant="primary">
        <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
        回到顶部
      </web-ui-button>
      <web-ui-button icon>
        <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
      </web-ui-button>
    </div>
  </div>
</template>
