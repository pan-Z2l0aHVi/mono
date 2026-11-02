<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSearch"></web-ui-icon>
      搜索
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideFolderOpen"></web-ui-icon>
      打开项目
    </span>
    <span class="flex items-center gap-2">
      <web-ui-icon :icon="lucideSettings"></web-ui-icon>
      设置
    </span>
  </div>
</template>

<script setup lang="ts">
import { lucideFolderOpen, lucideSearch, lucideSettings } from '@greypan/web-ui/icons'
</script>
