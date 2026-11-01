<template>
  <web-ui-select placeholder="请选择">
    <web-ui-option value="photo">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideImage"></web-ui-icon>
      照片
    </web-ui-option>
    <web-ui-option value="starred">
      <web-ui-icon slot="prefix" :size="14" :icon="lucideStar"></web-ui-icon>
      收藏
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideImage, lucideStar } from '@greypan/web-ui/icons'
</script>
