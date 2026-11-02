<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button>
      <web-ui-icon slot="prefix" :icon="lucideUpload" :size="16"></web-ui-icon>
      上传
    </web-ui-button>
    <web-ui-button variant="secondary">
      <web-ui-icon slot="suffix" :icon="lucideDownload" :size="16"></web-ui-icon>
      下载
    </web-ui-button>
    <web-ui-button icon aria-label="上一页">
      <web-ui-icon :icon="lucideChevronLeft"></web-ui-icon>
    </web-ui-button>
  </div>
</template>

<script setup lang="ts">
import { lucideChevronLeft, lucideDownload, lucideUpload } from '@greypan/web-ui/icons'
</script>
