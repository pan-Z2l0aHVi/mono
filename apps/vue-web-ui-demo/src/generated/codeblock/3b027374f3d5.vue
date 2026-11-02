<template>
  <div class="flex flex-wrap items-center gap-3">
    <web-ui-button variant="primary" @click="clicks += 1">按一下</web-ui-button>
    <web-ui-button variant="primary" disabled @click="clicks += 1">禁用（点了不计数）</web-ui-button>
    <web-ui-button variant="primary" loading @click="clicks += 1">加载（点了不计数）</web-ui-button>
    <output class="text-sm text-(--wui-color-text-secondary)">click：{{ clicks }} 次</output>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const clicks = ref(0)
</script>
