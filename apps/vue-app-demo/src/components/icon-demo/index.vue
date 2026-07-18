<script setup lang="ts">
import { lucideArrowUpToLine, lucideLoaderCircle } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>图标</h1>
    <h2>基础用法</h2>
    <div class="mb-12px flex items-center gap-16px">
      <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
      <web-ui-icon :icon="lucideLoaderCircle"></web-ui-icon>
    </div>

    <h2>Spin 动画</h2>
    <div class="mb-12px flex items-center gap-16px">
      <web-ui-icon :icon="lucideLoaderCircle" spin></web-ui-icon>
      <span>Loading...</span>
    </div>

    <h2>搭配 Button</h2>
    <div class="mb-12px flex gap-8px">
      <web-ui-button>
        <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
        Back to Top
      </web-ui-button>
      <web-ui-button variant="glass" icon>
        <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
      </web-ui-button>
    </div>
  </div>
</template>
