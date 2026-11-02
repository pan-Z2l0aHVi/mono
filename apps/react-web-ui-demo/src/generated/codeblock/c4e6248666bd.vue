<template>
  <web-ui-select placeholder="选择附件类型">
    <web-ui-option value="doc" label="文档">
      <web-ui-icon slot="prefix" :icon="lucideFileText" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PDF</span>
    </web-ui-option>
    <web-ui-option value="image" label="图片">
      <web-ui-icon slot="prefix" :icon="lucideImage" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">PNG</span>
    </web-ui-option>
    <web-ui-option value="video" label="视频（暂不可用）" disabled>
      <web-ui-icon slot="prefix" :icon="lucideFilm" :size="14"></web-ui-icon>
      <span slot="suffix" class="text-xs text-(--wui-color-text-secondary)">MP4</span>
    </web-ui-option>
  </web-ui-select>
</template>

<script setup lang="ts">
import { lucideFileText, lucideFilm, lucideImage } from '@greypan/web-ui/icons'
</script>
