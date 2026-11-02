<template>
  <div class="flex flex-col items-start gap-3">
    <web-ui-input borderless placeholder="无边框输入"></web-ui-input>
    <web-ui-input borderless aria-label="无边框输入框" value="无边框且有值"></web-ui-input>
    <web-ui-input borderless aria-label="搜索" placeholder="无边框带 icon">
      <web-ui-icon slot="prefix" :icon="lucideSearch" :size="16"></web-ui-icon>
    </web-ui-input>
  </div>
</template>

<script setup lang="ts">
import { lucideSearch } from '@greypan/web-ui/icons'
</script>
