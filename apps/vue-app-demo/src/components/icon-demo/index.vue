<script setup lang="ts">
import { lucideArrowUpToLine, lucideLoaderCircle, lucideChevronLeft, lucideSearch } from '@greypan/web-ui/icons'
</script>

<template>
  <div>
    <h1>图标</h1>
    <h2>基础用法</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-icon :icon="lucideArrowUpToLine"></web-ui-icon>
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
    </div>

    <h2>Spin 动画</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-icon :icon="lucideLoaderCircle" spin></web-ui-icon>
      <span>Loading...</span>
    </div>

    <h2>尺寸</h2>
    <div class="mb-3 flex items-center gap-4">
      <web-ui-icon :icon="lucideSearch" :size="16"></web-ui-icon>
      <web-ui-icon :icon="lucideSearch" :size="24"></web-ui-icon>
      <web-ui-icon :icon="lucideSearch" :size="32"></web-ui-icon>
    </div>

    <h2>颜色</h2>
    <div class="mb-3 flex items-center gap-4">
      <span class="text-red-500">
        <web-ui-icon :icon="lucideSearch"></web-ui-icon>
        继承 color
      </span>
      <web-ui-icon :icon="lucideSearch" color="#007aff"></web-ui-icon>
      <web-ui-icon :icon="lucideSearch" style="

--wui-icon-color: #34c759"></web-ui-icon>
    </div>

    <h2>搭配 Button</h2>
    <div class="mb-3 flex gap-2">
      <web-ui-button><web-ui-icon slot="prefix" :icon="lucideArrowUpToLine"></web-ui-icon>Back to Top</web-ui-button>
      <web-ui-button icon variant="glass">
        <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
      </web-ui-button>
    </div>
  </div>
</template>
