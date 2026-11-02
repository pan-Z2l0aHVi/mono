<template>
  <div class="flex flex-wrap items-center gap-6">
    <span class="flex items-center gap-2 text-(--wui-color-danger)">
      <web-ui-icon :icon="lucideHeart"></web-ui-icon>
      Follows the text color
    </span>
    <web-ui-icon :icon="lucideHeart" color="#007aff"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" class="[--wui-icon-color:#34c759]"></web-ui-icon>
    <web-ui-icon :icon="lucideHeart" color="#007aff" class="[--wui-icon-color:#34c759]"></web-ui-icon>
  </div>
</template>

<script setup lang="ts">
import { lucideHeart } from '@greypan/web-ui/icons'
</script>
