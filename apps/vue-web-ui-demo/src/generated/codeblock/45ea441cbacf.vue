<template>
  <web-ui-empty class="[--wui-empty-icon-size:51px]">
    <web-ui-icon slot="icon" :icon="lucideSearch" :size="51"></web-ui-icon>
    <strong>没有匹配的条目</strong>
    <span slot="description">试试更短的关键词，或者换一个筛选条件。</span>
    <div slot="action" class="flex items-center justify-center gap-3">
      <web-ui-button variant="secondary">清空筛选</web-ui-button>
      <web-ui-button variant="primary">返回列表</web-ui-button>
    </div>
  </web-ui-empty>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
